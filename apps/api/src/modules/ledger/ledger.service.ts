import { Injectable } from '@nestjs/common';
import { LedgerDirecao, LedgerTipo, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { dec, money, Decimal } from '../../domain/finance/money';

export interface PostEntryInput {
  emprestimoId: string;
  parcelaId?: string | null;
  tipo: LedgerTipo;
  direcao: LedgerDirecao;
  valor: Decimal.Value;
  competencia: Date;
  descricao: string;
  idempotencyKey?: string;
  criadoPor?: string | null;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lança um registro no razão (append-only) dentro de uma transação.
   * Calcula o saldo devedor resultante a partir do último lançamento.
   * Se `idempotencyKey` já existir, não duplica (retorna o existente).
   */
  async post(tx: Prisma.TransactionClient, input: PostEntryInput) {
    // Lock pessimista da linha do empréstimo: serializa lançamentos
    // concorrentes no mesmo contrato, evitando saldo calculado sobre
    // leitura desatualizada (race condition no append-only ledger).
    await tx.$queryRaw`SELECT id FROM "emprestimos" WHERE id = ${input.emprestimoId}::uuid FOR UPDATE`;

    if (input.idempotencyKey) {
      const existing = await tx.ledgerEntry.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return existing;
    }

    const saldoAtual = await this.saldoAtual(tx, input.emprestimoId);
    const valor = money(input.valor);
    const delta =
      input.direcao === LedgerDirecao.DEBITO ? valor : valor.negated();
    const saldoApos = money(saldoAtual.plus(delta));

    const entry = await tx.ledgerEntry.create({
      data: {
        emprestimoId: input.emprestimoId,
        parcelaId: input.parcelaId ?? null,
        tipo: input.tipo,
        direcao: input.direcao,
        valor,
        saldoApos,
        competencia: input.competencia,
        descricao: input.descricao,
        idempotencyKey: input.idempotencyKey,
        criadoPor: input.criadoPor ?? null,
        metadata: input.metadata,
      },
    });

    // Mantém o saldo devedor cacheado no empréstimo sincronizado com o razão.
    await tx.emprestimo.update({
      where: { id: input.emprestimoId },
      data: { saldoDevedor: saldoApos },
    });

    return entry;
  }

  /** Saldo devedor atual do empréstimo (último snapshot do razão). */
  async saldoAtual(
    client: Prisma.TransactionClient | PrismaService,
    emprestimoId: string,
  ): Promise<Decimal> {
    const ultimo = await client.ledgerEntry.findFirst({
      where: { emprestimoId },
      orderBy: { createdAt: 'desc' },
    });
    return ultimo ? dec(ultimo.saldoApos) : dec(0);
  }

  async getSaldo(emprestimoId: string): Promise<Decimal> {
    return this.saldoAtual(this.prisma, emprestimoId);
  }

  async extrato(emprestimoId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: { emprestimoId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Recalcula e persiste o saldo de principal em aberto a partir das parcelas
   * (principal contratado - principal já amortizado). Mantém o cache coerente.
   */
  async recalcularSaldoPrincipal(
    tx: Prisma.TransactionClient,
    emprestimoId: string,
  ): Promise<Decimal> {
    const parcelas = await tx.parcela.findMany({
      where: { emprestimoId },
    });

    let principalTotal = dec(0);
    let principalQuitado = dec(0);
    for (const p of parcelas) {
      const principal = dec(p.valorPrincipal);
      principalTotal = principalTotal.plus(principal);
      if (p.status === 'PAGA') {
        principalQuitado = principalQuitado.plus(principal);
      }
    }

    const saldoPrincipal = money(principalTotal.minus(principalQuitado));
    await tx.emprestimo.update({
      where: { id: emprestimoId },
      data: { saldoPrincipal },
    });
    return saldoPrincipal;
  }
}
