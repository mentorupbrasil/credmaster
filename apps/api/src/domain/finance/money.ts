import { Decimal } from 'decimal.js';

// Precisão alta para cálculos intermediários; arredondamento só na saída.
Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

export type Money = Decimal;

/**
 * Qualquer valor numérico aceitável: number, string, Decimal (decimal.js) ou
 * um objeto Decimal-like (ex.: Prisma.Decimal / decimal.js-light) que exponha
 * toString(). Converter via toString() evita o erro "Invalid argument" ao
 * misturar instâncias de bibliotecas Decimal diferentes.
 */
export type Numeric = Decimal.Value | { toString(): string } | null | undefined;

/** Cria um Decimal robusto a partir de number | string | Decimal | Decimal-like. */
export function dec(value: Numeric): Decimal {
  if (value === null || value === undefined) return new Decimal(0);
  if (value instanceof Decimal) return value;
  if (typeof value === 'number' || typeof value === 'string') {
    return new Decimal(value);
  }
  return new Decimal(value.toString());
}

/** Arredonda para 2 casas (moeda) usando HALF_UP. */
export function money(value: Numeric): Decimal {
  return dec(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Converte um percentual ao mês (ex.: 2 -> 0.02) em fração decimal. */
export function percentToRate(percent: Numeric): Decimal {
  return dec(percent).div(100);
}

/** Soma uma lista de valores monetários. */
export function sumMoney(values: Numeric[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.add(dec(v)), new Decimal(0));
}

/** Garante valor não-negativo (piso em zero). */
export function nonNegative(value: Decimal): Decimal {
  return value.isNegative() ? new Decimal(0) : value;
}

export function isZero(value: Numeric): boolean {
  return dec(value).isZero();
}

// Re-exporta a classe E o namespace de tipos (Decimal.Value etc.).
export { Decimal } from 'decimal.js';
