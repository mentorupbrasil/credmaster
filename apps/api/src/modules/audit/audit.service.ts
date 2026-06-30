import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AuditInput {
  actorId?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  antes?: unknown;
  depois?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra um evento de auditoria. Aceita um client transacional para
   * participar da mesma transação da operação auditada.
   */
  async log(
    input: AuditInput,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    await tx.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        acao: input.acao,
        entidade: input.entidade,
        entidadeId: input.entidadeId ?? null,
        antes: (input.antes as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        depois: (input.depois as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async list(params: { entidade?: string; entidadeId?: string; take?: number }) {
    return this.prisma.auditLog.findMany({
      where: {
        entidade: params.entidade,
        entidadeId: params.entidadeId,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(params.take ?? 100, 500),
    });
  }
}
