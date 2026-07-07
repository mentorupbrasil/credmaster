import { Injectable } from '@nestjs/common';
import {
  ClienteStatus,
  EmprestimoStatus,
  PagamentoStatus,
  ParcelaStatus,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FinanceSummaryService } from '../../common/finance/finance-summary.service';
import { toUtcDate, isoDate, addDays } from '../../domain/finance/dates';
import { dec, money } from '../../domain/finance/money';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: FinanceSummaryService,
  ) {}

  async resumo() {
    const hoje = toUtcDate(new Date());
    const amanha = addDays(hoje, 1);
    const em7dias = addDays(hoje, 7);
    const inicioMes = new Date(
      Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1),
    );
    const inicioDia = hoje;

    const [
      clientesAtivos,
      clientesPendentes,
      emprestimosAtivos,
      emAtraso,
      liquidados,
      totalEmprestadoAgg,
      recebidoMesAgg,
      recebidoHojeAgg,
      vencendoHoje,
      vencendo7dias,
      carteiraAtrasoAgg,
      totalReceberAgg,
    ] = await this.prisma.$transaction([
      this.prisma.cliente.count({
        where: {
          deletedAt: null,
          status: { in: [ClienteStatus.APROVADO, ClienteStatus.ATIVO] },
        },
      }),
      this.prisma.cliente.count({
        where: {
          deletedAt: null,
          status: { in: [ClienteStatus.PENDENTE, ClienteStatus.EM_ANALISE] },
        },
      }),
      this.prisma.emprestimo.count({
        where: {
          status: {
            in: [
              EmprestimoStatus.ATIVO,
              EmprestimoStatus.EM_ATRASO,
              EmprestimoStatus.VENCENDO_HOJE,
            ],
          },
        },
      }),
      this.prisma.emprestimo.count({
        where: { status: EmprestimoStatus.EM_ATRASO },
      }),
      this.prisma.emprestimo.count({
        where: { status: EmprestimoStatus.LIQUIDADO },
      }),
      this.prisma.emprestimo.aggregate({
        _sum: { valorPrincipal: true },
        where: {
          status: {
            in: [
              EmprestimoStatus.ATIVO,
              EmprestimoStatus.EM_ATRASO,
              EmprestimoStatus.VENCENDO_HOJE,
            ],
          },
        },
      }),
      this.prisma.pagamento.aggregate({
        _sum: { valor: true },
        where: {
          status: PagamentoStatus.CONFIRMADO,
          dataPagamento: { gte: inicioMes },
        },
      }),
      this.prisma.pagamento.aggregate({
        _sum: { valor: true },
        where: {
          status: PagamentoStatus.CONFIRMADO,
          dataPagamento: { gte: inicioDia, lt: amanha },
        },
      }),
      this.prisma.parcela.count({
        where: {
          vencimento: { gte: hoje, lt: amanha },
          status: { in: [ParcelaStatus.PENDENTE, ParcelaStatus.PARCIAL] },
        },
      }),
      this.prisma.parcela.count({
        where: {
          vencimento: { gte: hoje, lt: em7dias },
          status: { in: [ParcelaStatus.PENDENTE, ParcelaStatus.PARCIAL] },
        },
      }),
      this.prisma.parcela.aggregate({
        _sum: { valorParcela: true, valorPago: true, multa: true, jurosMora: true },
        where: { status: ParcelaStatus.VENCIDA },
      }),
      this.prisma.emprestimo.aggregate({
        _sum: { saldoDevedor: true, totalJuros: true },
        where: {
          status: {
            in: [
              EmprestimoStatus.ATIVO,
              EmprestimoStatus.EM_ATRASO,
              EmprestimoStatus.VENCENDO_HOJE,
            ],
          },
        },
      }),
    ]);

    const atrasados = await this.finance.listarContratosAtrasados();
    const carteiraEmAtraso = money(
      atrasados.reduce((acc, item) => acc.plus(dec(item.saldoRestante)), dec(0)),
    );

    const ultimosPagamentos = await this.prisma.pagamento.findMany({
      where: { status: PagamentoStatus.CONFIRMADO },
      orderBy: { dataPagamento: 'desc' },
      take: 8,
      include: {
        emprestimo: {
          select: {
            numeroContrato: true,
            cliente: { select: { nome: true } },
          },
        },
      },
    });

    const ultimosEmprestimos = await this.prisma.emprestimo.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { cliente: { select: { nome: true } } },
    });

    const vencendoHojeLista = await this.prisma.emprestimo.findMany({
      where: {
        dataFinal: { gte: hoje, lt: amanha },
        status: {
          in: [
            EmprestimoStatus.ATIVO,
            EmprestimoStatus.EM_ATRASO,
            EmprestimoStatus.VENCENDO_HOJE,
          ],
        },
      },
      take: 10,
      include: { cliente: { select: { id: true, nome: true, telefone: true } } },
    });

    const recebidoMes = money(recebidoMesAgg._sum.valor ?? 0);
    const lucroPrevisto = money(totalReceberAgg._sum.totalJuros ?? 0);
    const saldoAberto = money(totalReceberAgg._sum.saldoDevedor ?? 0);

    return {
      data: isoDate(hoje),
      clientesAtivos,
      clientesPendentes,
      emprestimosAtivos,
      emAtraso,
      liquidados,
      vencendoHoje,
      vencendoProximos7Dias: vencendo7dias,
      valorTotalEmprestado: money(totalEmprestadoAgg._sum.valorPrincipal ?? 0),
      valorTotalReceber: saldoAberto,
      valorRecebidoNoMes: recebidoMes,
      valorRecebidoHoje: money(recebidoHojeAgg._sum.valor ?? 0),
      carteiraEmAtraso,
      lucroPrevisto,
      lucroRecebido: recebidoMes,
      saldoEmAberto: saldoAberto,
      graficoStatus: {
        ativos: emprestimosAtivos - emAtraso,
        emAtraso,
        liquidados,
        vencendoHoje,
      },
      graficoRecebimento: {
        previsto: saldoAberto,
        recebidoMes,
      },
      vencendoHojeLista: await Promise.all(
        vencendoHojeLista.map(async (e) => ({
          ...(await this.finance.resumoEmprestimo(e.id, hoje)),
          clienteNome: e.cliente.nome,
        })),
      ),
      atrasadosLista: atrasados.slice(0, 10),
      ultimosPagamentos: ultimosPagamentos.map((p) => ({
        id: p.id,
        valor: p.valor,
        dataPagamento: p.dataPagamento,
        forma: p.forma,
        clienteNome: p.emprestimo.cliente.nome,
        numeroContrato: p.emprestimo.numeroContrato,
      })),
      ultimosEmprestimos: ultimosEmprestimos.map((e) => ({
        id: e.id,
        numeroContrato: e.numeroContrato,
        valorPrincipal: e.valorPrincipal,
        status: e.status,
        clienteNome: e.cliente.nome,
        createdAt: e.createdAt,
      })),
    };
  }
}
