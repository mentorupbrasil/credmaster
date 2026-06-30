import { Decimal, dec } from './money';

/**
 * CET (Custo Efetivo Total) - exigência regulatória (Resolução CMN/BCB).
 *
 * É a taxa periódica que iguala o valor presente do fluxo de pagamentos ao
 * valor líquido liberado ao cliente (principal - tarifas + tarifas financiadas).
 *
 * Resolvemos a TIR (IRR) do fluxo de caixa por Newton-Raphson com fallback
 * para bisseção (robusto e sem dependências externas).
 *
 * Convenção do fluxo: índice 0 = liberação (negativo, saída do credor),
 * índices seguintes = parcelas recebidas (positivas).
 */

export interface CetInput {
  /** Valor líquido efetivamente recebido pelo cliente. */
  valorLiberado: Decimal.Value;
  /** Valores das parcelas, na ordem dos períodos (mensais). */
  parcelas: Decimal.Value[];
  /** Tarifas pagas à vista na liberação (IOF, cadastro etc.), opcional. */
  tarifasIniciais?: Decimal.Value;
}

export interface CetResult {
  cetMes: Decimal; // fração (ex.: 0.0234 = 2,34% a.m.)
  cetAno: Decimal; // fração efetiva ao ano
}

function npv(rate: number, flows: number[]): number {
  let acc = 0;
  for (let t = 0; t < flows.length; t++) {
    acc += flows[t] / Math.pow(1 + rate, t);
  }
  return acc;
}

function dNpv(rate: number, flows: number[]): number {
  let acc = 0;
  for (let t = 1; t < flows.length; t++) {
    acc += (-t * flows[t]) / Math.pow(1 + rate, t + 1);
  }
  return acc;
}

/** Resolve a taxa periódica (IRR). Retorna número (fração). */
export function irr(flows: number[], guess = 0.02): number {
  // Newton-Raphson
  let rate = guess;
  for (let iter = 0; iter < 100; iter++) {
    const f = npv(rate, flows);
    const df = dNpv(rate, flows);
    if (Math.abs(df) < 1e-12) break;
    const next = rate - f / df;
    if (!isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-12) return next;
    rate = next;
    if (rate <= -0.9999) rate = -0.9999 + 1e-6;
  }

  // Fallback: bisseção entre -0.9999 e 10 (1000% a.m.)
  let lo = -0.9999;
  let hi = 10;
  let flo = npv(lo, flows);
  for (let iter = 0; iter < 500; iter++) {
    const mid = (lo + hi) / 2;
    const fmid = npv(mid, flows);
    if (Math.abs(fmid) < 1e-10) return mid;
    if (flo * fmid < 0) {
      hi = mid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  return (lo + hi) / 2;
}

export function calcularCet(input: CetInput): CetResult {
  const liberado = dec(input.valorLiberado).minus(dec(input.tarifasIniciais ?? 0));
  const flows: number[] = [Number(liberado.neg().toString())];
  for (const p of input.parcelas) {
    flows.push(Number(dec(p).toString()));
  }

  const mensal = irr(flows, 0.02);
  const cetMes = dec(mensal);
  const cetAno = dec(Math.pow(1 + mensal, 12) - 1);

  return {
    cetMes: cetMes.toDecimalPlaces(8, Decimal.ROUND_HALF_UP),
    cetAno: cetAno.toDecimalPlaces(8, Decimal.ROUND_HALF_UP),
  };
}
