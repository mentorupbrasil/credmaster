import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);

  // Observabilidade opcional (Sentry) — ativada apenas se SENTRY_DSN existir.
  const sentryDsn = config.get<string>('sentry.dsn');
  if (sentryDsn) {
    try {
      const Sentry = await import('@sentry/node');
      Sentry.init({
        dsn: sentryDsn,
        environment: config.get<string>('nodeEnv', 'development'),
        tracesSampleRate: 0.1,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Falha ao inicializar Sentry:', (e as Error).message);
    }
  }

  const apiPrefix = config.get<string>('apiPrefix', 'api');
  const port = config.get<number>('port', 3333);
  const corsOrigins = config.get<string[]>('corsOrigins', ['http://localhost:3000']);

  app.use(helmet());
  app.use(cookieParser());
  // Correlation id por requisição (propagado no header e nos logs).
  app.use((req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers['x-request-id'] as string) || randomUUID();
    req.headers['x-request-id'] = id;
    res.setHeader('x-request-id', id);
    next();
  });
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  // ---- OpenAPI / Swagger ----
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CredMaster API')
    .setDescription('API da plataforma de gestão de crédito CredMaster')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // Bind em 0.0.0.0 para funcionar em containers (Render/Railway/Fly/Docker).
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`CredMaster API rodando em http://localhost:${port}/${apiPrefix}`);
  console.log(`Swagger em http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();
