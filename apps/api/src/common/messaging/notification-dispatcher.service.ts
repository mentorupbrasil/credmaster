import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificacaoCanal } from '@prisma/client';
import {
  DeliveryResult,
  NOTIFICATION_PROVIDERS,
  NotificationProvider,
  OutboundMessage,
} from './notification-provider';

@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);
  private readonly byCanal = new Map<NotificacaoCanal, NotificationProvider>();

  constructor(
    @Inject(NOTIFICATION_PROVIDERS) providers: NotificationProvider[],
  ) {
    for (const p of providers) {
      this.byCanal.set(p.canal, p);
    }
  }

  async dispatch(message: OutboundMessage): Promise<DeliveryResult> {
    const provider = this.byCanal.get(message.canal);
    if (!provider) {
      this.logger.warn(`Sem provider para canal ${message.canal}`);
      return { entregue: false, provedor: 'none', detalhe: 'canal sem provider' };
    }
    return provider.send(message);
  }
}
