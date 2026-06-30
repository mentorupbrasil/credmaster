import { Injectable } from '@nestjs/common';
import { EmprestimoStatus, PagamentoStatus, ParcelaStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { dec, money, nonNegative, sumMoney } from '../../domain/finance/money';
import { toUtcDate } from '../../domain/finance/dates';

@Injectable()
export class RelatoriosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  /** Carteira ativa com saldo devedor por contrato. */
  async carteira() {
    const emprestimos = await this.prisma.emprestimo.findMany({
      where: {
        status: { in: [EmprestimoStatus.ATIVO, EmprestimoStatus.EM_ATRASO] },
      },
      include: { cliente: { select: { id: true, nome: true, cpf: true } } },
      orderBy: { dataContratacao: 'desc' },
    });

    const linhas = await Promise.all(
      emprestimos.map(async (e) => ({
        emprestimoId: e.id,
        numeroContrato: e.numeroContrato,
        cliente: e.cliente,
        principal: money(e.valorPrincipal),
        saldoDevedor: money(await this.ledger.getSaldo(e.id)),
        status: e.status,
        dataFinal: e.dataFinal,
      })),
    );

    return {
      totalContratos: linhas.length,
      saldoTotal: sumMoney(linhas.map((l) => l.saldoDevedor)),
      linhas,
    };
  }

  /** Relatório de inadimplência (parcelas vencidas em aberto). */
  async inadimplencia() {
    const parcelas = await this.prisma.parcela.findMany({
      where: { status: ParcelaStatus.VENCIDA },
      include: {
        emprestimo: {
          include: { cliente: { select: { id: true, nome: true, cpf: true } } },
        },
      },
      orderBy: { vencimento: 'asc' },
    });

    const linhas = parcelas.map((p) => {
      const emAberto = nonNegative(
        dec(p.valorParcela)
          .plus(dec(p.multa))
          .plus(dec(p.jurosMora))
          .minus(dec(p.valorPago)),
      );
      return {
        emprestimoId: p.emprestimoId,
        numeroContrato: p.emprestimo.numeroContrato,
        cliente: p.emprestimo.cliente,
        parcela: p.numero,
        vencimento: p.vencimento,
        diasAtraso: p.diasAtraso,
        valorOriginal: money(p.valorParcela),
        multa: money(p.multa),
        jurosMora: money(p.jurosMora),
        totalEmAberto: money(emAberto),
      };
    });

    return {
      totalParcelas: linhas.length,
      totalEmAberto: sumMoney(linhas.map((l) => l.totalEmAberto)),
      linhas,
    };
  }

  /** Recebimentos confirmados em um período. */
  async recebimentos(de?: string, ate?: string) {
    const inicio = de ? toUtcDate(de) : undefined;
    const fim = ate ? toUtcDate(ate) : undefined;

    const pagamentos = await this.prisma.pagamento.findMany({
      where: {
        status: PagamentoStatus.CONFIRMADO,
        dataPagamento: { gte: inicio, lte: fim },
      },
      include: {
        emprestimo: {
          include: { cliente: { select: { id: true, nome: true } } },
        },
      },
      orderBy: { dataPagamento: 'desc' },
    });

    return {
      periodo: { de: de ?? null, ate: ate ?? null },
      total: sumMoney(pagamentos.map((p) => dec(p.valor))),
      quantidade: pagamentos.length,
      pagamentos: pagamentos.map((p) => ({
        id: p.id,
        data: p.dataPagamento,
        valor: money(p.valor),
        forma: p.forma,
        contrato: p.emprestimo.numeroContrato,
        cliente: p.emprestimo.cliente,
      })),
    };
  }
}
