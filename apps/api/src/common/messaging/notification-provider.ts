import { NotificacaoCanal } from '@prisma/client';

export interface OutboundMessage {
  canal: NotificacaoCanal;
  destino: string; // e-mail, telefone, deviceToken, etc.
  titulo: string;
  mensagem: string;
  metadata?: Record<string, unknown>;
}

export interface DeliveryResult {
  entregue: boolean;
  provedor: string;
  detalhe?: string;
}

/**
 * Porta de saída para envio de mensagens por um canal específico.
 * Implementações reais (SES, Twilio, FCM, WhatsApp Cloud API) devem
 * implementar esta interface e ser registradas no NotificationDispatcher.
 */
export interface NotificationProvider {
  readonly canal: NotificacaoCanal;
  send(message: OutboundMessage): Promise<DeliveryResult>;
}

export const NOTIFICATION_PROVIDERS = Symbol('NOTIFICATION_PROVIDERS');
