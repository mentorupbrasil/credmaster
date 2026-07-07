import { Injectable } from '@nestjs/common';
import {
  ClienteStatus,
  EmprestimoStatus,
  PagamentoStatus,
  ParcelaStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { calcularEncargos } from '../../domain/finance/mora';
import {
  calcularTotalAtualizado,
  determinarStatusCliente,
  determinarStatusContrato,
} from '../../domain/finance/simple-loan';
import { toUtcDate } from '../../domain/finance/dates';
import { dec, money } from '../../domain/finance/money';

@Injectable()
export class FinanceSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async resumoEmprestimo(emprestimoId: string, referencia = new Date()) {
    const emp = await this.prisma.emprestimo.findUnique({
      where: { id: emprestimoId },
      include: {
        parcelas: true,
        pagamentos: { where: { status: PagamentoStatus.CONFIRMADO } },
        cliente: { select: { id: true, nome: true, telefone: true, whatsapp: true } },
      },
    });
    if (!emp) return null;

    const ref = toUtcDate(referencia);
    const parcela = emp.parcelas[0];
    const valorPago = money(
      emp.pagamentos.reduce((acc, p) => acc.plus(dec(p.valor)), dec(0)),
    );
    const valorTotalOriginal = money(emp.totalAPagar ?? emp.valorPrincipal);
    const baseAberto = nonNegativeMoney(
      dec(parcela?.valorParcela ?? valorTotalOriginal).minus(dec(parcela?.valorPago ?? 0)),
    );

    const encargos = parcela
      ? calcularEncargos({
          valorEmAberto: baseAberto,
          vencimento: parcela.vencimento,
          referencia: ref,
          multaPercent: emp.multaAtrasoPercent,
          jurosMoraMesPercent: emp.jurosMoraMesPercent,
          multaDiariaFixa: emp.multaDiariaFixa,
        })
      : {
          diasAtraso: 0,
          multa: money(0),
          jurosMora: money(0),
          total: money(0),
        };

    const encargoAtraso = money(dec(parcela?.multa ?? 0).plus(dec(parcela?.jurosMora ?? 0)));
    const encargoUsar = encargoAtraso.gt(0) ? encargoAtraso : encargos.total;
    const saldoRestante = calcularTotalAtualizado(
      valorTotalOriginal,
      encargoUsar,
      valorPago,
    );

    return {
      emprestimoId: emp.id,
      numeroContrato: emp.numeroContrato,
      cliente: emp.cliente,
      valorEmprestado: emp.valorPrincipal,
      taxaJurosPercent: emp.taxaJurosPercent ?? dec(emp.taxaJurosMes).mul(100),
      valorJuros: emp.totalJuros ?? money(0),
      valorTotalOriginal,
      valorPago,
      encargoAtraso: encargoUsar,
      saldoRestante,
      diasAtraso: encargos.diasAtraso,
      dataEmprestimo: emp.dataContratacao,
      dataVencimento: emp.dataFinal,
      status: emp.status,
      statusExibicao: determinarStatusContrato({
        status: emp.status,
        dataVencimento: emp.dataFinal,
        saldoDevedor: saldoRestante,
        referencia: ref,
      }),
      observacoes: emp.observacoes,
    };
  }

  async resumoCliente(clienteId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, deletedAt: null },
      include: {
        enderecos: { where: { principal: true }, take: 1 },
        emprestimos: {
          include: {
            parcelas: true,
            pagamentos: { where: { status: PagamentoStatus.CONFIRMADO } },
          },
        },
      },
    });
    if (!cliente) return null;

    const ref = toUtcDate(new Date());
    let totalEmprestado = dec(0);
    let totalRecebido = dec(0);
    let totalAberto = dec(0);
    let totalAtraso = dec(0);
    let temAtraso = false;
    let temAtivo = false;
    let todosLiquidados = true;
    const teveEmprestimo = cliente.emprestimos.length > 0;

    for (const emp of cliente.emprestimos) {
      if (emp.status === EmprestimoStatus.CANCELADO) continue;
      totalEmprestado = totalEmprestado.plus(dec(emp.valorPrincipal));
      const pago = emp.pagamentos.reduce((a, p) => a.plus(dec(p.valor)), dec(0));
      totalRecebido = totalRecebido.plus(pago);

      const resumo = await this.resumoEmprestimo(emp.id, ref);
      if (!resumo) continue;
      if (resumo.statusExibicao === 'LIQUIDADO') continue;
      todosLiquidados = false;
      totalAberto = totalAberto.plus(dec(resumo.saldoRestante));
      if (resumo.statusExibicao === 'EM_ATRASO') {
        temAtraso = true;
        totalAtraso = totalAtraso.plus(dec(resumo.saldoRestante));
      }
      if (['ATIVO', 'VENCENDO_HOJE', 'EM_ATRASO'].includes(resumo.statusExibicao)) {
        temAtivo = true;
      }
    }

    return {
      clienteId: cliente.id,
      quantidadeContratos: cliente.emprestimos.filter(
        (e) => e.status !== EmprestimoStatus.CANCELADO,
      ).length,
      totalEmprestado: money(totalEmprestado),
      totalRecebido: money(totalRecebido),
      totalAberto: money(totalAberto),
      totalAtraso: money(totalAtraso),
      statusExibicao: determinarStatusCliente({
        status: cliente.status,
        temAtraso,
        temAtivo,
        todosLiquidados: teveEmprestimo && todosLiquidados,
        teveEmprestimo,
      }),
    };
  }

  async listarContratosAtrasados() {
    const ref = toUtcDate(new Date());
    const emprestimos = await this.prisma.emprestimo.findMany({
      where: {
        status: { in: [EmprestimoStatus.ATIVO, EmprestimoStatus.EM_ATRASO] },
        dataFinal: { lt: ref },
      },
      include: {
        cliente: true,
        parcelas: true,
        pagamentos: { where: { status: PagamentoStatus.CONFIRMADO } },
      },
      orderBy: { dataFinal: 'asc' },
    });

    const itens = [];
    for (const emp of emprestimos) {
      const resumo = await this.resumoEmprestimo(emp.id, ref);
      if (!resumo || resumo.saldoRestante.lte(0)) continue;
      if (resumo.diasAtraso <= 0) continue;
      const whatsapp = emp.cliente.whatsapp ?? emp.cliente.telefone;
      const msg = `Olá, ${emp.cliente.nome.split(' ')[0]}. Tudo bem? Estou passando para lembrar que seu contrato no valor de R$ ${resumo.saldoRestante.toFixed(2).replace('.', ',')} está em aberto desde ${emp.dataFinal.toISOString().slice(0, 10).split('-').reverse().join('/')}. Poderia me dar um retorno sobre o pagamento?`;
      itens.push({
        ...resumo,
        clienteNome: emp.cliente.nome,
        whatsapp,
        whatsappLink: `https://wa.me/55${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`,
        mensagemWhatsapp: msg,
      });
    }
    return itens;
  }
}

function nonNegativeMoney(value: Prisma.Decimal | import('../../domain/finance/money').Decimal) {
  const d = dec(value);
  return d.lt(0) ? money(0) : money(d);
}
