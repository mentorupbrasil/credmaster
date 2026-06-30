import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno do servidor';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string' ? res : ((res as any).message ?? exception.message);
      code = (res as any)?.error ?? exception.name;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = mapPrismaError(exception);
      status = mapped.status;
      message = mapped.message;
      code = exception.code;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      error: code,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

function mapPrismaError(e: Prisma.PrismaClientKnownRequestError): {
  status: number;
  message: string;
} {
  switch (e.code) {
    case 'P2002':
      return {
        status: HttpStatus.CONFLICT,
        message: `Registro já existe (campo único: ${(e.meta?.target as string[])?.join(', ')})`,
      };
    case 'P2025':
      return { status: HttpStatus.NOT_FOUND, message: 'Registro não encontrado' };
    case 'P2003':
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Violação de chave estrangeira',
      };
    default:
      return {
        status: HttpStatus.BAD_REQUEST,
        message: `Erro de banco de dados (${e.code})`,
      };
  }
}
