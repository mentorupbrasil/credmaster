import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './common/prisma/prisma.module';
import { MessagingModule } from './common/messaging/messaging.module';
import { IntegrationsModule } from './common/integrations/integrations.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { EmprestimosModule } from './modules/emprestimos/emprestimos.module';
import { PagamentosModule } from './modules/pagamentos/pagamentos.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { CobrancaModule } from './modules/cobranca/cobranca.module';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { RelatoriosModule } from './modules/relatorios/relatorios.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { ParametrosModule } from './modules/parametros/parametros.module';
import { HealthModule } from './modules/health/health.module';
import { SeedModule } from './modules/seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie', '*.passwordHash'],
        autoLogging: true,
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('rateLimit.ttl', 60) * 1000,
          limit: config.get<number>('rateLimit.max', 120),
        },
      ],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MessagingModule,
    IntegrationsModule,
    AuditModule,
    ParametrosModule,
    AuthModule,
    UsersModule,
    ClientesModule,
    EmprestimosModule,
    PagamentosModule,
    LedgerModule,
    CobrancaModule,
    NotificacoesModule,
    RelatoriosModule,
    DashboardModule,
    HealthModule,
    SeedModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
