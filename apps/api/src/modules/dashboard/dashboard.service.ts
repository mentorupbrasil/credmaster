import { Injectable } from '@nestjs/common';
import {
  ClienteStatus,
  EmprestimoStatus,
  PagamentoStatus,
  ParcelaStatus,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toUtcDate, isoDate, addDays } from '../../domain/finance/dates';
import { dec, money } from '../../domain/finance/money';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async resumo() {
    const hoje = toUtcDate(new Date());
    const amanha = addDays(hoje, 1);
    const inicioMes = new Date(
      Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1),
    );

    const [
      clientesAtivos,
      clientesPendentes,
      emprestimosAtivos,
      emAtraso,
      liquidados,
      totalEmprestadoAgg,
      recebidoMesAgg,
      vencendoHoje,
      carteiraAtrasoAgg,
    ] = await this.prisma.$transaction([
      this.prisma.cliente.count({ where: { status: ClienteStatus.APROVADO } }),
      this.prisma.cliente.count({
        where: { status: { in: [ClienteStatus.PENDENTE, ClienteStatus.EM_ANALISE] } },
      }),
      this.prisma.emprestimo.count({
        where: {
          status: { in: [EmprestimoStatus.ATIVO, EmprestimoStatus.EM_ATRASO] },
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
          status: { in: [EmprestimoStatus.ATIVO, EmprestimoStatus.EM_ATRASO] },
        },
      }),
      this.prisma.pagamento.aggregate({
        _sum: { valor: true },
        where: {
          status: PagamentoStatus.CONFIRMADO,
          dataPagamento: { gte: inicioMes },
        },
      }),
      this.prisma.parcela.count({
        where: {
          vencimento: { gte: hoje, lt: amanha },
          status: { in: [ParcelaStatus.PENDENTE, ParcelaStatus.PARCIAL] },
        },
      }),
      this.prisma.parcela.aggregate({
        _sum: { valorParcela: true, valorPago: true, multa: true, jurosMora: true },
        where: { status: ParcelaStatus.VENCIDA },
      }),
    ]);

    const totalEmprestado = money(totalEmprestadoAgg._sum.valorPrincipal ?? 0);

    return {
      data: isoDate(hoje),
      clientesAtivos,
      clientesPendentes,
      emprestimosAtivos,
      emAtraso,
      liquidados,
      vencendoHoje,
      valorTotalEmprestado: totalEmprestado,
      valorRecebidoNoMes: money(recebidoMesAgg._sum.valor ?? 0),
      carteiraEmAtraso: money(
        dec(carteiraAtrasoAgg._sum.valorParcela)
          .plus(dec(carteiraAtrasoAgg._sum.multa))
          .plus(dec(carteiraAtrasoAgg._sum.jurosMora))
          .minus(dec(carteiraAtrasoAgg._sum.valorPago)),
      ),
    };
  }
}
