import { Injectable, Logger } from '@nestjs/common';
import { NotificacaoCanal } from '@prisma/client';
import {
  DeliveryResult,
  NotificationProvider,
  OutboundMessage,
} from './notification-provider';

/**
 * Provider de fallback que apenas registra a mensagem em log.
 * Em produção, substitua/registre providers reais por canal.
 */
abstract class BaseConsoleProvider implements NotificationProvider {
  protected readonly logger = new Logger(this.constructor.name);
  abstract readonly canal: NotificacaoCanal;

  async send(message: OutboundMessage): Promise<DeliveryResult> {
    this.logger.log(
      `[${this.canal}] -> ${message.destino} | ${message.titulo}: ${message.mensagem}`,
    );
    return { entregue: true, provedor: 'console' };
  }
}

@Injectable()
export class ConsoleEmailProvider extends BaseConsoleProvider {
  readonly canal = NotificacaoCanal.EMAIL;
}

@Injectable()
export class ConsoleSmsProvider extends BaseConsoleProvider {
  readonly canal = NotificacaoCanal.SMS;
}

@Injectable()
export class ConsolePushProvider extends BaseConsoleProvider {
  readonly canal = NotificacaoCanal.PUSH;
}

@Injectable()
export class ConsoleWhatsappProvider extends BaseConsoleProvider {
  readonly canal = NotificacaoCanal.WHATSAPP;
}
