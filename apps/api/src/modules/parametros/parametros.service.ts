import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { dec, percentToRate, Decimal } from '../../domain/finance/money';

export const PARAM_KEYS = {
  MULTA_MAX_PERCENT: 'regulatorio.multa_max_percent',
  JUROS_MORA_MAX_MES_PERCENT: 'regulatorio.juros_mora_max_mes_percent',
} as const;

@Injectable()
export class ParametrosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async get(chave: string): Promise<string | null> {
    const p = await this.prisma.parametroSistema.findUnique({ where: { chave } });
    return p?.valor ?? null;
  }

  async set(chave: string, valor: string, descricao?: string, actorId?: string) {
    return this.prisma.parametroSistema.upsert({
      where: { chave },
      create: { chave, valor, descricao, atualizadoPor: actorId },
      update: { valor, descricao, atualizadoPor: actorId },
    });
  }

  async list() {
    return this.prisma.parametroSistema.findMany({ orderBy: { chave: 'asc' } });
  }

  /** Limites legais (em fração decimal). DB sobrescreve o default do .env. */
  async getLimitesRegulatorios(): Promise<{
    multaMax: Decimal;
    jurosMoraMaxMes: Decimal;
  }> {
    const multaStr =
      (await this.get(PARAM_KEYS.MULTA_MAX_PERCENT)) ??
      this.config.get<string>('regulatorio.multaMaxPercent', '2');
    const moraStr =
      (await this.get(PARAM_KEYS.JUROS_MORA_MAX_MES_PERCENT)) ??
      this.config.get<string>('regulatorio.jurosMoraMaxMesPercent', '1');

    return {
      multaMax: percentToRate(dec(multaStr)),
      jurosMoraMaxMes: percentToRate(dec(moraStr)),
    };
  }
}
