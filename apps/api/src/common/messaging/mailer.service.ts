import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationDispatcher } from './notification-dispatcher.service';
import { NotificacaoCanal } from '@prisma/client';

/**
 * Serviço de e-mails transacionais (verificação de conta, redefinição de
 * senha, etc.). Usa o NotificationDispatcher (canal EMAIL). Para produção,
 * registre um provider EMAIL real (SES/SendGrid/SMTP).
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  private get appUrl(): string {
    return this.config.get<string>('app.webUrl', 'http://localhost:3001');
  }

  async sendEmailVerification(to: string, token: string) {
    const link = `${this.appUrl}/verificar-email?token=${encodeURIComponent(token)}`;
    return this.dispatcher.dispatch({
      canal: NotificacaoCanal.EMAIL,
      destino: to,
      titulo: 'Confirme seu e-mail',
      mensagem: `Confirme seu cadastro acessando: ${link}`,
      metadata: { token, link },
    });
  }

  async sendPasswordReset(to: string, token: string) {
    const link = `${this.appUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
    return this.dispatcher.dispatch({
      canal: NotificacaoCanal.EMAIL,
      destino: to,
      titulo: 'Redefinição de senha',
      mensagem: `Para redefinir sua senha, acesse: ${link} (válido por tempo limitado).`,
      metadata: { token, link },
    });
  }
}
