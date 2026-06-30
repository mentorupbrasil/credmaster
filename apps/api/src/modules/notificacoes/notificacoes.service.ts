import { Injectable, Logger } from '@nestjs/common';
import {
  NotificacaoCanal,
  NotificacaoStatus,
  NotificacaoTipo,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationDispatcher } from '../../common/messaging/notification-dispatcher.service';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

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

    const canal = input.canal ?? NotificacaoCanal.IN_APP;

    try {
      const notificacao = await client.notificacao.create({
        data: {
          clienteId: input.clienteId,
          canal,
          tipo: input.tipo,
          titulo: input.titulo,
          mensagem: input.mensagem,
          payload: input.payload,
          idempotencyKey: input.idempotencyKey,
          status: NotificacaoStatus.ENVIADA,
          enviadaEm: new Date(),
        },
      });

      // Canais externos são despachados via provider (best-effort, não
      // derruba a operação principal caso o provedor falhe).
      if (canal !== NotificacaoCanal.IN_APP) {
        void this.despacharExterno(canal, notificacao.id, input);
      }

      return notificacao;
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

  private async despacharExterno(
    canal: NotificacaoCanal,
    notificacaoId: string,
    input: CriarNotificacaoInput,
  ) {
    try {
      const cliente = await this.prisma.cliente.findUnique({
        where: { id: input.clienteId },
        select: { email: true, telefone: true },
      });
      if (!cliente) return;
      const destino =
        canal === NotificacaoCanal.SMS || canal === NotificacaoCanal.WHATSAPP
          ? cliente.telefone
          : cliente.email;

      const result = await this.dispatcher.dispatch({
        canal,
        destino,
        titulo: input.titulo,
        mensagem: input.mensagem,
      });

      if (!result.entregue) {
        await this.prisma.notificacao.update({
          where: { id: notificacaoId },
          data: { status: NotificacaoStatus.FALHA, erro: result.detalhe },
        });
      }
    } catch (e) {
      this.logger.warn(
        `Falha ao despachar notificação ${notificacaoId}: ${(e as Error).message}`,
      );
      await this.prisma.notificacao
        .update({
          where: { id: notificacaoId },
          data: { status: NotificacaoStatus.FALHA, erro: (e as Error).message },
        })
        .catch(() => undefined);
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
