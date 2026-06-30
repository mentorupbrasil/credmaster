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

    return tx.ledgerEntry.create({
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
}
