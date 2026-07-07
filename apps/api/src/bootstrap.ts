import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { ExpressAdapter } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

export async function createNestApp(): Promise<{
  app: INestApplication;
  expressApp: express.Express;
}> {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter, {
    bufferLogs: !process.env.VERCEL,
  });
  if (!process.env.VERCEL) {
    app.useLogger(app.get(Logger));
  }

  const config = app.get(ConfigService);

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
  const corsOrigins = config.get<string[]>('corsOrigins', ['http://localhost:3000']);

  app.use(helmet());
  app.use(cookieParser());
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

  // Swagger pesa no cold start serverless — só fora do Vercel.
  if (!process.env.VERCEL) {
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
  }

  await app.init();
  return { app, expressApp };
}
