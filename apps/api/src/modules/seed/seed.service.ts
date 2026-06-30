import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Seeding idempotente no boot da aplicação. Garante que o administrador e os
 * parâmetros regulatórios existam, sem necessidade de rodar comandos manuais
 * após o deploy. Controlado por SEED_ON_BOOT (default: ligado).
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    if (this.config.get<string>('seed.onBoot') === 'false') return;
    try {
      await this.semearParametros();
      await this.semearAdmin();
    } catch (e) {
      // Nunca derruba o boot por causa do seeding.
      this.logger.warn(`Seeding no boot falhou (ignorado): ${(e as Error).message}`);
    }
  }

  private async semearParametros() {
    const params: { chave: string; valor: string; descricao: string }[] = [
      { chave: 'regulatorio.multa_max_percent', valor: '2', descricao: 'Multa máxima por atraso (%)' },
      { chave: 'regulatorio.juros_mora_max_mes_percent', valor: '1', descricao: 'Juros de mora máx. ao mês (%)' },
      { chave: 'regulatorio.taxa_juros_max_mes_percent', valor: '12', descricao: 'Teto de juros ao mês (%)' },
      { chave: 'regulatorio.valor_min_global', valor: '100', descricao: 'Valor mínimo global (R$)' },
      { chave: 'regulatorio.valor_max_global', valor: '1000000', descricao: 'Valor máximo global (R$)' },
      { chave: 'regulatorio.prazo_min_global', valor: '1', descricao: 'Prazo mínimo global (meses)' },
      { chave: 'regulatorio.prazo_max_global', valor: '120', descricao: 'Prazo máximo global (meses)' },
      { chave: 'regulatorio.iof_diario_percent', valor: '0.0082', descricao: 'IOF diário (%)' },
      { chave: 'regulatorio.iof_adicional_percent', valor: '0.38', descricao: 'IOF adicional (%)' },
    ];
    for (const p of params) {
      await this.prisma.parametroSistema.upsert({
        where: { chave: p.chave },
        create: p,
        update: {},
      });
    }
  }

  private async semearAdmin() {
    const email = (
      this.config.get<string>('seed.adminEmail') ?? 'admin@credmaster.dev'
    ).toLowerCase();
    const senha = this.config.get<string>('seed.adminSenha') ?? 'Admin@123456';

    const existente = await this.prisma.user.findUnique({ where: { email } });
    if (existente) return;

    const passwordHash = await argon2.hash(senha, { type: argon2.argon2id });
    await this.prisma.user.create({
      data: {
        email,
        nome: 'Administrador',
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ATIVO,
        emailVerificado: true,
      },
    });
    this.logger.log(`Admin criado: ${email}`);
  }
}
