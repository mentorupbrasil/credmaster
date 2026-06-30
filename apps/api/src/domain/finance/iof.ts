import { dec, money, Decimal } from './money';
import { diffDays, toUtcDate } from './dates';

export interface IofInput {
  /** Parcelas com a parcela de principal e a data de vencimento. */
  amortizacoes: { valorPrincipal: Decimal.Value; vencimento: Date }[];
  dataContratacao: Date;
  /** Alíquota diária em fração (ex.: 0.000082 para 0,0082% a.d.). */
  iofDiario: Decimal.Value;
  /** Alíquota adicional fixa em fração (ex.: 0.0038 para 0,38%). */
  iofAdicional: Decimal.Value;
}

/**
 * Calcula o IOF de crédito (metodologia pessoa física simplificada):
 *  - IOF diário: alíquota/dia sobre cada parcela de principal, proporcional
 *    aos dias até o vencimento, limitado a 365 dias por parcela.
 *  - IOF adicional: alíquota fixa sobre o principal total.
 */
export function calcularIof(input: IofInput): Decimal {
  const diaria = dec(input.iofDiario);
  const adicional = dec(input.iofAdicional);
  const inicio = toUtcDate(input.dataContratacao);

  let principalTotal = dec(0);
  let iofDiarioTotal = dec(0);

  for (const a of input.amortizacoes) {
    const principal = dec(a.valorPrincipal);
    principalTotal = principalTotal.plus(principal);
    const dias = Math.min(365, Math.max(0, diffDays(toUtcDate(a.vencimento), inicio)));
    iofDiarioTotal = iofDiarioTotal.plus(principal.mul(diaria).mul(dias));
  }

  const iofAdicionalTotal = principalTotal.mul(adicional);
  return money(iofDiarioTotal.plus(iofAdicionalTotal));
}
