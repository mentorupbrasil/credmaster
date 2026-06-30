import { TipoAmortizacao } from '@prisma/client';
import { gerarCronograma, ScheduleItem, totaisCronograma } from '../../domain/finance/amortization';
import { calcularCet } from '../../domain/finance/cet';
import { dec, percentToRate, Decimal } from '../../domain/finance/money';

export interface CondicoesEmprestimo {
  valorPrincipal: Decimal.Value;
  taxaJurosMesPercent: Decimal.Value; // ex.: 2 = 2% a.m.
  tipoAmortizacao: TipoAmortizacao;
  prazoMeses: number;
  diaVencimento: number;
  dataContratacao: Date;
  tarifasIniciais?: Decimal.Value;
}

export interface ResultadoCalculo {
  cronograma: ScheduleItem[];
  totalJuros: Decimal;
  totalAPagar: Decimal;
  cetMes: Decimal;
  cetAno: Decimal;
}

/** Calcula cronograma + totais + CET para um conjunto de condições. */
export function calcularEmprestimo(cond: CondicoesEmprestimo): ResultadoCalculo {
  const cronograma = gerarCronograma({
    principal: cond.valorPrincipal,
    taxaPeriodo: percentToRate(dec(cond.taxaJurosMesPercent)),
    prazo: cond.prazoMeses,
    tipo: cond.tipoAmortizacao,
    dataInicio: cond.dataContratacao,
    diaVencimento: cond.diaVencimento,
  });

  const totais = totaisCronograma(cronograma);
  const cet = calcularCet({
    valorLiberado: cond.valorPrincipal,
    parcelas: cronograma.map((p) => p.valorParcela),
    tarifasIniciais: cond.tarifasIniciais,
  });

  return {
    cronograma,
    totalJuros: totais.totalJuros,
    totalAPagar: totais.totalAPagar,
    cetMes: cet.cetMes,
    cetAno: cet.cetAno,
  };
}
