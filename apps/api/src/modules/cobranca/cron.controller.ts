import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CobrancaService } from './cobranca.service';

/** Endpoint chamado pelo Vercel Cron (substitui o cron em memória). */
@ApiTags('cron')
@Controller({ path: 'cron', version: '1' })
export class CronController {
  constructor(
    private readonly cobrancaService: CobrancaService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('cobranca')
  async executar(@Headers('authorization') authorization?: string) {
    const secret = this.config.get<string>('cron.secret');
    if (secret && authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException();
    }
    await this.cobrancaService.rotinaAgendada();
    return { ok: true, timestamp: new Date().toISOString() };
  }
}
