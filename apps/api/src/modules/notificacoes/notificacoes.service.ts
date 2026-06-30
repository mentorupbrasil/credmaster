import { Injectable, Logger } from '@nestjs/common';
import {
  NotificacaoCanal,
  NotificacaoStatus,
  NotificacaoTipo,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CriarNotificacaoInput {
  clienteId: string;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  canal?: NotificacaoCanal;
  payload?: Prisma.InputJsonValue;
  idempotencyKey?: string;
}

@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria (e "envia") uma notificação. Idempotente quando `idempotencyKey`
   * é informado — evita duplicar avisos no job diário.
   *
   * O envio real (e-mail/SMS/push) deve ser plugado num provedor; aqui a
   * notificação fica registrada e marcada como ENVIADA (canal IN_APP sempre).
   */
  async criar(
    input: CriarNotificacaoInput,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    if (input.idempotencyKey) {
      const existing = await client.notificacao.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return existing;
    }

    try {
      return await client.notificacao.create({
        data: {
          clienteId: input.clienteId,
          canal: input.canal ?? NotificacaoCanal.IN_APP,
          tipo: input.tipo,
          titulo: input.titulo,
          mensagem: input.mensagem,
          payload: input.payload,
          idempotencyKey: input.idempotencyKey,
          status: NotificacaoStatus.ENVIADA,
          enviadaEm: new Date(),
        },
      });
    } catch (e) {
      // Conflito de idempotência sob concorrência: busca o existente.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002' &&
        input.idempotencyKey
      ) {
        return client.notificacao.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
      }
      throw e;
    }
  }

  async listarDoCliente(clienteId: string, apenasNaoLidas = false) {
    return this.prisma.notificacao.findMany({
      where: { clienteId, lida: apenasNaoLidas ? false : undefined },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async marcarComoLida(id: string, clienteId: string) {
    await this.prisma.notificacao.updateMany({
      where: { id, clienteId },
      data: { lida: true },
    });
    return { sucesso: true };
  }
}
