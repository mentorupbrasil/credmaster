/**
 * Utilitários de data trabalhando em UTC (datas "puras", sem hora) para evitar
 * problemas de fuso ao calcular vencimentos e dias de atraso.
 */

/** Normaliza para meia-noite UTC. */
export function toUtcDate(d: Date | string): Date {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Último dia do mês (1-31) para o ano/mês dados (mês 0-indexado). */
export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Retorna a data de vencimento `n` meses após a base, fixando o dia desejado.
 * Se o mês não tem o dia (ex.: dia 31 em fevereiro), usa o último dia do mês.
 */
export function addMonthsKeepingDay(base: Date, months: number, dia: number): Date {
  const b = toUtcDate(base);
  const year = b.getUTCFullYear();
  const month = b.getUTCMonth() + months;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const maxDay = lastDayOfMonth(targetYear, targetMonth);
  const day = Math.min(dia, maxDay);
  return new Date(Date.UTC(targetYear, targetMonth, day));
}

/** Adiciona dias a uma data (UTC). */
export function addDays(base: Date, days: number): Date {
  const b = toUtcDate(base);
  return new Date(b.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Diferença em dias (a - b), inteiro. Positivo se a > b. */
export function diffDays(a: Date, b: Date): number {
  const MS = 24 * 60 * 60 * 1000;
  return Math.round((toUtcDate(a).getTime() - toUtcDate(b).getTime()) / MS);
}

/** Formata como YYYY-MM-DD (UTC). */
export function isoDate(d: Date): string {
  return toUtcDate(d).toISOString().slice(0, 10);
}
