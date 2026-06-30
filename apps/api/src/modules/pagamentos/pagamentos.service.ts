import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmprestimoStatus,
  LedgerDirecao,
  LedgerTipo,
  ParcelaStatus,
  PagamentoStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { dec, money, nonNegative } from '../../domain/finance/money';
import { toUtcDate } from '../../domain/finance/dates';
import { RegistrarPagamentoDto } from './dto/pagamentos.dto';

@Injectable()
export class PagamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  async registrar(
    emprestimoId: string,
    dto: RegistrarPagamentoDto,
    actorId: string,
  ) {
    const valor = money(dto.valor);
    const dataPagamento = dto.dataPagamento
      ? toUtcDate(dto.dataPagamento)
      : toUtcDate(new Date());

    return this.prisma.$transaction(async (tx) => {
      const parcela = await tx.parcela.findFirst({
        where: { id: dto.parcelaId, emprestimoId },
        include: { emprestimo: true },
      });
      if (!parcela) throw new NotFoundException('Parcela não encontrada');
      if (parcela.status === ParcelaStatus.PAGA) {
        throw new BadRequestException('Parcela já está quitada');
      }
      if (parcela.status === ParcelaStatus.CANCELADA) {
        throw new BadRequestException('Parcela cancelada');
      }
      if (
        ![EmprestimoStatus.ATIVO, EmprestimoStatus.EM_ATRASO].includes(
          parcela.emprestimo.status,
        )
      ) {
        throw new BadRequestException(
          `Empréstimo não está ativo (status: ${parcela.emprestimo.status})`,
        );
      }

      const totalDevido = dec(parcela.valorParcela)
        .plus(dec(parcela.multa))
        .plus(dec(parcela.jurosMora));
      const jaPago = dec(parcela.valorPago);
      const emAberto = nonNegative(totalDevido.minus(jaPago));

      if (valor.gt(emAberto.plus(0.0001))) {
        throw new BadRequestException(
          `Valor (${valor}) excede o saldo em aberto da parcela (${money(emAberto)})`,
        );
      }

      const pagamento = await tx.pagamento.create({
        data: {
          emprestimoId,
          parcelaId: parcela.id,
          valor,
          forma: dto.forma,
          status: PagamentoStatus.CONFIRMADO,
          dataPagamento,
          comprovante: dto.comprovante,
          observacao: dto.observacao,
          registradoPor: actorId,
        },
      });

      const novoPago = money(jaPago.plus(valor));
      const quitada = novoPago.gte(money(totalDevido));
      await tx.parcela.update({
        where: { id: parcela.id },
        data: {
          valorPago: novoPago,
          status: quitada ? ParcelaStatus.PAGA : ParcelaStatus.PARCIAL,
          dataPagamento: quitada ? dataPagamento : null,
        },
      });

      await this.ledger.post(tx, {
        emprestimoId,
        parcelaId: parcela.id,
        tipo: LedgerTipo.PAGAMENTO,
        direcao: LedgerDirecao.CREDITO,
        valor,
        competencia: dataPagamento,
        descricao: `Pagamento parcela ${parcela.numero} (${dto.forma})`,
        criadoPor: actorId,
      });

      await this.recalcularStatusEmprestimo(tx, emprestimoId, actorId);

      await this.audit.log(
        {
          actorId,
          acao: 'PAGAMENTO_REGISTRADO',
          entidade: 'Pagamento',
          entidadeId: pagamento.id,
          depois: { valor: dto.valor, parcelaId: parcela.id },
        },
        tx,
      );

      await this.notificacoes.criar(
        {
          clienteId: parcela.emprestimo.clienteId,
          tipo: 'PAGAMENTO_CONFIRMADO',
          titulo: 'Pagamento recebido',
          mensagem: `Recebemos o pagamento de R$ ${money(valor)} da parcela ${parcela.numero}.`,
        },
        tx,
      );

      return pagamento;
    });
  }

  async estornar(pagamentoId: string, motivo: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const pagamento = await tx.pagamento.findUnique({
        where: { id: pagamentoId },
        include: { parcela: true },
      });
      if (!pagamento) throw new NotFoundException('Pagamento não encontrado');
      if (pagamento.status === PagamentoStatus.ESTORNADO) {
        throw new BadRequestException('Pagamento já estornado');
      }

      await tx.pagamento.update({
        where: { id: pagamentoId },
        data: {
          status: PagamentoStatus.ESTORNADO,
          estornadoPor: actorId,
          estornadoEm: new Date(),
          motivoEstorno: motivo,
        },
      });

      if (pagamento.parcela) {
        const novoPago = nonNegative(
          dec(pagamento.parcela.valorPago).minus(dec(pagamento.valor)),
        );
        const totalDevido = dec(pagamento.parcela.valorParcela)
          .plus(dec(pagamento.parcela.multa))
          .plus(dec(pagamento.parcela.jurosMora));
        await tx.parcela.update({
          where: { id: pagamento.parcela.id },
          data: {
            valorPago: money(novoPago),
            status: novoPago.isZero()
              ? ParcelaStatus.PENDENTE
              : ParcelaStatus.PARCIAL,
            dataPagamento: null,
          },
        });
        void totalDevido;
      }

      await this.ledger.post(tx, {
        emprestimoId: pagamento.emprestimoId,
        parcelaId: pagamento.parcelaId,
        tipo: LedgerTipo.ESTORNO,
        direcao: LedgerDirecao.DEBITO,
        valor: pagamento.valor,
        competencia: toUtcDate(new Date()),
        descricao: `Estorno de pagamento (${motivo})`,
        criadoPor: actorId,
      });

      await this.recalcularStatusEmprestimo(tx, pagamento.emprestimoId, actorId);

      await this.audit.log(
        {
          actorId,
          acao: 'PAGAMENTO_ESTORNADO',
          entidade: 'Pagamento',
          entidadeId: pagamentoId,
          depois: { motivo },
        },
        tx,
      );

      return { sucesso: true };
    });
  }

  async listarDoEmprestimo(emprestimoId: string) {
    return this.prisma.pagamento.findMany({
      where: { emprestimoId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Recalcula o status do empréstimo a partir das parcelas:
   *  - todas pagas/canceladas -> LIQUIDADO
   *  - alguma vencida em aberto -> EM_ATRASO
   *  - caso contrário -> ATIVO
   */
  private async recalcularStatusEmprestimo(
    tx: Prisma.TransactionClient,
    emprestimoId: string,
    actorId: string,
  ) {
    const emp = await tx.emprestimo.findUnique({
      where: { id: emprestimoId },
      include: { parcelas: true },
    });
    if (!emp) return;
    if ([EmprestimoStatus.CANCELADO].includes(emp.status)) return;

    // Mantém o saldo de principal cacheado coerente com as parcelas.
    await this.ledger.recalcularSaldoPrincipal(tx, emprestimoId);

    const hoje = toUtcDate(new Date());
    const abertas = emp.parcelas.filter(
      (p) => p.status !== ParcelaStatus.PAGA && p.status !== ParcelaStatus.CANCELADA,
    );

    let novoStatus: EmprestimoStatus;
    let dataLiquidacao: Date | null = emp.dataLiquidacao;

    if (abertas.length === 0) {
      novoStatus = EmprestimoStatus.LIQUIDADO;
      dataLiquidacao = dataLiquidacao ?? new Date();
    } else if (abertas.some((p) => toUtcDate(p.vencimento) < hoje)) {
      novoStatus = EmprestimoStatus.EM_ATRASO;
    } else {
      novoStatus = EmprestimoStatus.ATIVO;
    }

    if (novoStatus !== emp.status || dataLiquidacao !== emp.dataLiquidacao) {
      await tx.emprestimo.update({
        where: { id: emprestimoId },
        data: { status: novoStatus, dataLiquidacao },
      });

      if (novoStatus === EmprestimoStatus.LIQUIDADO) {
        await this.notificacoes.criar(
          {
            clienteId: emp.clienteId,
            tipo: 'EMPRESTIMO_LIQUIDADO',
            titulo: 'Empréstimo quitado',
            mensagem: `Parabéns! O empréstimo ${emp.numeroContrato} foi totalmente quitado.`,
            idempotencyKey: `liquidado:${emprestimoId}`,
          },
          tx,
        );
        await this.audit.log(
          {
            actorId,
            acao: 'EMPRESTIMO_LIQUIDADO',
            entidade: 'Emprestimo',
            entidadeId: emprestimoId,
          },
          tx,
        );
      }
    }
  }
}
