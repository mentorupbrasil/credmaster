import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { dec, percentToRate, Decimal } from '../../domain/finance/money';

export const APP_PARAM_KEYS = {
  TAXA_JUROS_PADRAO: 'app.taxa_juros_padrao',
  VALOR_ATRASO_DIARIO: 'app.valor_atraso_diario',
  NOME_SISTEMA: 'app.nome_sistema',
} as const;

export const PARAM_KEYS = {
  MULTA_MAX_PERCENT: 'regulatorio.multa_max_percent',
  JUROS_MORA_MAX_MES_PERCENT: 'regulatorio.juros_mora_max_mes_percent',
  TAXA_JUROS_MAX_MES_PERCENT: 'regulatorio.taxa_juros_max_mes_percent',
  VALOR_MIN_GLOBAL: 'regulatorio.valor_min_global',
  VALOR_MAX_GLOBAL: 'regulatorio.valor_max_global',
  PRAZO_MIN_GLOBAL: 'regulatorio.prazo_min_global',
  PRAZO_MAX_GLOBAL: 'regulatorio.prazo_max_global',
  IOF_DIARIO_PERCENT: 'regulatorio.iof_diario_percent',
  IOF_ADICIONAL_PERCENT: 'regulatorio.iof_adicional_percent',
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

  async getConfigApp() {
    const [taxa, atraso, nome] = await Promise.all([
      this.get(APP_PARAM_KEYS.TAXA_JUROS_PADRAO),
      this.get(APP_PARAM_KEYS.VALOR_ATRASO_DIARIO),
      this.get(APP_PARAM_KEYS.NOME_SISTEMA),
    ]);
    return {
      taxaJurosPadrao: taxa ?? '20',
      valorAtrasoDiario: atraso ?? '10',
      nomeSistema: nome ?? 'CredMaster',
    };
  }

  async setConfigApp(
    input: { taxaJurosPadrao?: string; valorAtrasoDiario?: string; nomeSistema?: string },
    actorId?: string,
  ) {
    if (input.taxaJurosPadrao !== undefined) {
      await this.set(APP_PARAM_KEYS.TAXA_JUROS_PADRAO, input.taxaJurosPadrao, 'Taxa padrão (%)', actorId);
    }
    if (input.valorAtrasoDiario !== undefined) {
      await this.set(APP_PARAM_KEYS.VALOR_ATRASO_DIARIO, input.valorAtrasoDiario, 'Encargo diário (R$)', actorId);
    }
    if (input.nomeSistema !== undefined) {
      await this.set(APP_PARAM_KEYS.NOME_SISTEMA, input.nomeSistema, 'Nome do sistema', actorId);
    }
    return this.getConfigApp();
  }

  async list() {
    return this.prisma.parametroSistema.findMany({ orderBy: { chave: 'asc' } });
  }

  /** Limites legais (em fração decimal). DB sobrescreve o default do .env. */
  async getLimitesRegulatorios(): Promise<{
    multaMax: Decimal;
    jurosMoraMaxMes: Decimal;
    taxaJurosMaxMes: Decimal;
    valorMinGlobal: Decimal;
    valorMaxGlobal: Decimal;
    prazoMinGlobal: number;
    prazoMaxGlobal: number;
    iofDiario: Decimal;
    iofAdicional: Decimal;
  }> {
    const multaStr =
      (await this.get(PARAM_KEYS.MULTA_MAX_PERCENT)) ??
      this.config.get<string>('regulatorio.multaMaxPercent', '2');
    const moraStr =
      (await this.get(PARAM_KEYS.JUROS_MORA_MAX_MES_PERCENT)) ??
      this.config.get<string>('regulatorio.jurosMoraMaxMesPercent', '1');
    const taxaMaxStr =
      (await this.get(PARAM_KEYS.TAXA_JUROS_MAX_MES_PERCENT)) ??
      this.config.get<string>('regulatorio.taxaJurosMaxMesPercent', '12');
    const valorMinStr =
      (await this.get(PARAM_KEYS.VALOR_MIN_GLOBAL)) ??
      this.config.get<string>('regulatorio.valorMinGlobal', '100');
    const valorMaxStr =
      (await this.get(PARAM_KEYS.VALOR_MAX_GLOBAL)) ??
      this.config.get<string>('regulatorio.valorMaxGlobal', '1000000');
    const prazoMinStr =
      (await this.get(PARAM_KEYS.PRAZO_MIN_GLOBAL)) ??
      String(this.config.get<number>('regulatorio.prazoMinGlobalMeses', 1));
    const prazoMaxStr =
      (await this.get(PARAM_KEYS.PRAZO_MAX_GLOBAL)) ??
      String(this.config.get<number>('regulatorio.prazoMaxGlobalMeses', 120));
    const iofDiarioStr =
      (await this.get(PARAM_KEYS.IOF_DIARIO_PERCENT)) ??
      this.config.get<string>('regulatorio.iofDiarioPercent', '0.0082');
    const iofAdicionalStr =
      (await this.get(PARAM_KEYS.IOF_ADICIONAL_PERCENT)) ??
      this.config.get<string>('regulatorio.iofAdicionalPercent', '0.38');

    return {
      multaMax: percentToRate(dec(multaStr)),
      jurosMoraMaxMes: percentToRate(dec(moraStr)),
      taxaJurosMaxMes: percentToRate(dec(taxaMaxStr)),
      valorMinGlobal: dec(valorMinStr),
      valorMaxGlobal: dec(valorMaxStr),
      prazoMinGlobal: parseInt(prazoMinStr, 10),
      prazoMaxGlobal: parseInt(prazoMaxStr, 10),
      iofDiario: percentToRate(dec(iofDiarioStr)),
      iofAdicional: percentToRate(dec(iofAdicionalStr)),
    };
  }
}
