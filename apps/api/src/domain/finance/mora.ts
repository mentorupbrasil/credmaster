import { Decimal, dec, money, nonNegative } from './money';
import { diffDays } from './dates';

/**
 * Cálculo de encargos por atraso (mora).
 *
 * Modelo padrão (CDC):
 *  - Multa: incidência ÚNICA sobre o valor em aberto (limitada por lei, ex.: 2%).
 *  - Juros de mora: pro-rata die (linear), com base na taxa mensal de mora.
 *      moraDiaria = valorEmAberto * (jurosMoraMes / 30) * diasAtraso
 *
 * A função retorna o valor-ALVO de encargos para a data de referência.
 * O serviço de cobrança posta no razão apenas o DELTA em relação ao já
 * lançado, garantindo idempotência (rodar 2x não cobra em dobro).
 */

export interface EncargosInput {
  valorEmAberto: Decimal.Value;
  vencimento: Date;
  referencia: Date;
  /** Multa em fração (ex.: 0.02 = 2%). */
  multaPercent: Decimal.Value;
  /** Juros de mora ao mês em fração (ex.: 0.01 = 1% a.m.). */
  jurosMoraMesPercent: Decimal.Value;
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
