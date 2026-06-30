import { Decimal, dec, money, sumMoney } from './money';
import { addMonthsKeepingDay } from './dates';

export type TipoAmortizacao = 'PRICE' | 'SAC' | 'BULLET';
export type ParcelaTipo = 'JUROS' | 'AMORTIZACAO' | 'PRINCIPAL' | 'MISTA';

export interface ScheduleInput {
  /** Principal liberado. */
  principal: Decimal.Value;
  /** Taxa de juros ao período em fração (ex.: 0.02 = 2%). */
  taxaPeriodo: Decimal.Value;
  /** Número de parcelas. */
  prazo: number;
  tipo: TipoAmortizacao;
  /** Data da contratação/liberação (base para o 1º vencimento). */
  dataInicio: Date;
  /** Dia do mês de vencimento (1-28 recomendado). */
  diaVencimento: number;
}

export interface ScheduleItem {
  numero: number;
  tipo: ParcelaTipo;
  vencimento: Date;
  valorPrincipal: Decimal;
  valorJuros: Decimal;
  valorParcela: Decimal;
  saldoDevedorApos: Decimal;
}

/**
 * Gera o cronograma de parcelas para PRICE, SAC ou BULLET.
 *
 * Garantias:
 *  - A soma das amortizações de principal é EXATAMENTE igual ao principal.
 *  - O saldo devedor após a última parcela é EXATAMENTE zero.
 *  - Diferenças de arredondamento (centavos) são ajustadas na última parcela.
 */
export function gerarCronograma(input: ScheduleInput): ScheduleItem[] {
  const { tipo } = input;
  if (input.prazo < 1) {
    throw new Error('Prazo deve ser >= 1');
  }
  switch (tipo) {
    case 'PRICE':
      return cronogramaPrice(input);
    case 'SAC':
      return cronogramaSac(input);
    case 'BULLET':
      return cronogramaBullet(input);
    default:
      throw new Error(`Tipo de amortização não suportado: ${tipo}`);
  }
}

function vencimentoDe(input: ScheduleInput, numero: number): Date {
  return addMonthsKeepingDay(input.dataInicio, numero, input.diaVencimento);
}

function cronogramaPrice(input: ScheduleInput): ScheduleItem[] {
  const P = dec(input.principal);
  const i = dec(input.taxaPeriodo);
  const n = input.prazo;

  // PMT = P * i / (1 - (1+i)^-n); se i == 0 => P / n
  const pmt = i.isZero()
    ? P.div(n)
    : P.mul(i).div(dec(1).minus(dec(1).plus(i).pow(-n)));

  const itens: ScheduleItem[] = [];
  let saldo = P;
  let principalAcumulado = dec(0);

  for (let k = 1; k <= n; k++) {
    const juros = money(saldo.mul(i));
    let amortizacao = money(pmt.minus(juros));
    let parcela = money(pmt);

    if (k === n) {
      // Última: zera o saldo exatamente e corrige centavos.
      amortizacao = saldo;
      parcela = money(amortizacao.plus(juros));
    }

    saldo = saldo.minus(amortizacao);
    principalAcumulado = principalAcumulado.plus(amortizacao);

    itens.push({
      numero: k,
      tipo: 'MISTA',
      vencimento: vencimentoDe(input, k),
      valorPrincipal: money(amortizacao),
      valorJuros: juros,
      valorParcela: parcela,
      saldoDevedorApos: money(saldo),
    });
  }

  return reconcile(itens, P);
}

function cronogramaSac(input: ScheduleInput): ScheduleItem[] {
  const P = dec(input.principal);
  const i = dec(input.taxaPeriodo);
  const n = input.prazo;
  const amortBase = money(P.div(n));

  const itens: ScheduleItem[] = [];
  let saldo = P;

  for (let k = 1; k <= n; k++) {
    const juros = money(saldo.mul(i));
    let amortizacao = amortBase;
    if (k === n) {
      amortizacao = saldo; // ajusta resíduo
    }
    const parcela = money(amortizacao.plus(juros));
    saldo = saldo.minus(amortizacao);

    itens.push({
      numero: k,
      tipo: 'MISTA',
      vencimento: vencimentoDe(input, k),
      valorPrincipal: money(amortizacao),
      valorJuros: juros,
      valorParcela: parcela,
      saldoDevedorApos: money(saldo),
    });
  }

  return reconcile(itens, P);
}

function cronogramaBullet(input: ScheduleInput): ScheduleItem[] {
  const P = dec(input.principal);
  const i = dec(input.taxaPeriodo);
  const n = input.prazo;
  const juros = money(P.mul(i));

  const itens: ScheduleItem[] = [];
  for (let k = 1; k <= n; k++) {
    const ehUltima = k === n;
    itens.push({
      numero: k,
      tipo: ehUltima ? 'PRINCIPAL' : 'JUROS',
      vencimento: vencimentoDe(input, k),
      valorPrincipal: ehUltima ? money(P) : money(0),
      valorJuros: juros,
      valorParcela: ehUltima ? money(P.plus(juros)) : juros,
      saldoDevedorApos: ehUltima ? money(0) : money(P),
    });
  }
  return itens;
}

/**
 * Verifica invariantes: soma de principal == P. Caso haja resíduo de centavo
 * por arredondamento, corrige na última parcela.
 */
function reconcile(itens: ScheduleItem[], principal: Decimal): ScheduleItem[] {
  const somaPrincipal = sumMoney(itens.map((p) => p.valorPrincipal));
  const diff = money(principal.minus(somaPrincipal));
  if (!diff.isZero()) {
    const ultima = itens[itens.length - 1];
    ultima.valorPrincipal = money(ultima.valorPrincipal.plus(diff));
    ultima.valorParcela = money(ultima.valorPrincipal.plus(ultima.valorJuros));
    ultima.saldoDevedorApos = money(0);
  }
  return itens;
}

export interface ScheduleTotais {
  totalJuros: Decimal;
  totalAPagar: Decimal;
  totalPrincipal: Decimal;
}

export function totaisCronograma(itens: ScheduleItem[]): ScheduleTotais {
  return {
    totalJuros: sumMoney(itens.map((p) => p.valorJuros)),
    totalPrincipal: sumMoney(itens.map((p) => p.valorPrincipal)),
    totalAPagar: sumMoney(itens.map((p) => p.valorParcela)),
  };
}
