import { Decimal, dec, money, nonNegative } from './money';
import { diffDays } from './dates';

/** Empréstimo simples: juros = principal × taxa%, total = principal + juros. */
export interface EmprestimoSimplesInput {
  valorEmprestado: Decimal.Value;
  /** Percentual (ex.: 20 = 20%). */
  taxaJurosPercent: Decimal.Value;
  dataEmprestimo: Date;
  dataVencimento: Date;
  multaDiariaFixa?: Decimal.Value;
}

export interface EmprestimoSimplesResult {
  valorEmprestado: Decimal;
  valorJuros: Decimal;
  valorTotalOriginal: Decimal;
  prazoDias: number;
  dataEmprestimo: Date;
  dataVencimento: Date;
  multaDiariaFixa: Decimal;
}

export function calcularEmprestimoSimples(
  input: EmprestimoSimplesInput,
): EmprestimoSimplesResult {
  const valorEmprestado = money(input.valorEmprestado);
  const taxa = dec(input.taxaJurosPercent).div(100);
  const valorJuros = money(valorEmprestado.mul(taxa));
  const valorTotalOriginal = money(valorEmprestado.plus(valorJuros));
  const prazoDias = Math.max(1, diffDays(input.dataVencimento, input.dataEmprestimo));
  const multaDiariaFixa = money(input.multaDiariaFixa ?? 10);

  return {
    valorEmprestado,
    valorJuros,
    valorTotalOriginal,
    prazoDias,
    dataEmprestimo: input.dataEmprestimo,
    dataVencimento: input.dataVencimento,
    multaDiariaFixa,
  };
}

export function calcularSaldoRestante(
  valorTotalOriginal: Decimal.Value,
  valorPago: Decimal.Value,
  encargoAtraso: Decimal.Value,
): Decimal {
  return money(
    nonNegative(dec(valorTotalOriginal).plus(dec(encargoAtraso)).minus(dec(valorPago))),
  );
}

export function calcularEncargoAtrasoDiario(
  diasAtraso: number,
  multaDiariaFixa: Decimal.Value,
): Decimal {
  if (diasAtraso <= 0) return money(0);
  return money(dec(multaDiariaFixa).mul(diasAtraso));
}

export function calcularTotalAtualizado(
  valorTotalOriginal: Decimal.Value,
  encargoAtraso: Decimal.Value,
  valorPago: Decimal.Value,
): Decimal {
  return calcularSaldoRestante(valorTotalOriginal, valorPago, encargoAtraso);
}

export type StatusContratoExibicao =
  | 'ATIVO'
  | 'VENCENDO_HOJE'
  | 'EM_ATRASO'
  | 'LIQUIDADO'
  | 'CANCELADO';

export function determinarStatusContrato(input: {
  status: string;
  dataVencimento: Date;
  saldoDevedor: Decimal.Value;
  referencia?: Date;
}): StatusContratoExibicao {
  if (input.status === 'CANCELADO') return 'CANCELADO';
  if (input.status === 'LIQUIDADO') return 'LIQUIDADO';
  if (dec(input.saldoDevedor).lte(0)) return 'LIQUIDADO';

  const ref = input.referencia ?? new Date();
  const dias = diffDays(ref, input.dataVencimento);
  if (dias === 0) return 'VENCENDO_HOJE';
  if (dias > 0) return 'EM_ATRASO';
  return 'ATIVO';
}

export type StatusClienteExibicao =
  | 'ATIVO'
  | 'INADIMPLENTE'
  | 'BLOQUEADO'
  | 'QUITADO'
  | 'PENDENTE';

export function determinarStatusCliente(input: {
  status: string;
  temAtraso: boolean;
  temAtivo: boolean;
  todosLiquidados: boolean;
  teveEmprestimo: boolean;
}): StatusClienteExibicao {
  if (input.status === 'BLOQUEADO' || input.status === 'INATIVO') return 'BLOQUEADO';
  if (input.status === 'PENDENTE' || input.status === 'EM_ANALISE') return 'PENDENTE';
  if (input.temAtraso) return 'INADIMPLENTE';
  if (input.teveEmprestimo && !input.temAtivo && input.todosLiquidados) return 'QUITADO';
  return 'ATIVO';
}
