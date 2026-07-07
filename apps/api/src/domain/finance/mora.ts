import { Decimal, dec, money, nonNegative } from './money';
import { diffDays } from './dates';

export interface EncargosInput {
  valorEmAberto: Decimal.Value;
  vencimento: Date;
  referencia: Date;
  /** Multa em fração (ex.: 0.02 = 2%). Ignorado se multaDiariaFixa > 0. */
  multaPercent: Decimal.Value;
  /** Juros de mora ao mês em fração. Ignorado se multaDiariaFixa > 0. */
  jurosMoraMesPercent: Decimal.Value;
  /** Encargo fixo por dia (R$). Modelo CredMaster simples. */
  multaDiariaFixa?: Decimal.Value;
}

export interface EncargosResult {
  diasAtraso: number;
  multa: Decimal;
  jurosMora: Decimal;
  total: Decimal;
}

export function calcularEncargos(input: EncargosInput): EncargosResult {
  const valorEmAberto = nonNegative(dec(input.valorEmAberto));
  const diasAtraso = Math.max(0, diffDays(input.referencia, input.vencimento));

  if (diasAtraso <= 0 || valorEmAberto.isZero()) {
    return { diasAtraso: 0, multa: money(0), jurosMora: money(0), total: money(0) };
  }

  const diaria = dec(input.multaDiariaFixa ?? 0);
  if (diaria.gt(0)) {
    const encargo = money(diaria.mul(diasAtraso));
    return { diasAtraso, multa: encargo, jurosMora: money(0), total: encargo };
  }

  const multa = money(valorEmAberto.mul(dec(input.multaPercent)));
  const moraDiaria = dec(input.jurosMoraMesPercent).div(30);
  const jurosMora = money(valorEmAberto.mul(moraDiaria).mul(diasAtraso));

  return {
    diasAtraso,
    multa,
    jurosMora,
    total: money(multa.plus(jurosMora)),
  };
}
