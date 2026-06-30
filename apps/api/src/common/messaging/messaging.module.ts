import { Global, Module } from '@nestjs/common';
import {
  ConsoleEmailProvider,
  ConsolePushProvider,
  ConsoleSmsProvider,
  ConsoleWhatsappProvider,
} from './console-providers';
import { NotificationDispatcher } from './notification-dispatcher.service';
import { NOTIFICATION_PROVIDERS } from './notification-provider';
import { MailerService } from './mailer.service';

@Global()
@Module({
  providers: [
    ConsoleEmailProvider,
    ConsoleSmsProvider,
    ConsolePushProvider,
    ConsoleWhatsappProvider,
    {
      provide: NOTIFICATION_PROVIDERS,
      useFactory: (
        email: ConsoleEmailProvider,
        sms: ConsoleSmsProvider,
        push: ConsolePushProvider,
        whatsapp: ConsoleWhatsappProvider,
      ) => [email, sms, push, whatsapp],
      inject: [
        ConsoleEmailProvider,
        ConsoleSmsProvider,
        ConsolePushProvider,
        ConsoleWhatsappProvider,
      ],
    },
    NotificationDispatcher,
    MailerService,
  ],
  exports: [NotificationDispatcher, MailerService],
})
export class MessagingModule {}
