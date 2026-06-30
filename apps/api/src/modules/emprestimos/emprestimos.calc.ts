import { TipoAmortizacao } from '@prisma/client';
import { gerarCronograma, ScheduleItem, totaisCronograma } from '../../domain/finance/amortization';
import { calcularCet } from '../../domain/finance/cet';
import { calcularIof } from '../../domain/finance/iof';
import { dec, money, percentToRate, Decimal } from '../../domain/finance/money';

export interface CondicoesEmprestimo {
  valorPrincipal: Decimal.Value;
  taxaJurosMesPercent: Decimal.Value; // ex.: 2 = 2% a.m.
  tipoAmortizacao: TipoAmortizacao;
  prazoMeses: number;
  diaVencimento: number;
  dataContratacao: Date;
  tarifasIniciais?: Decimal.Value;
  /** Alíquotas de IOF em fração (opcionais). Quando ausentes, IOF = 0. */
  iofDiario?: Decimal.Value;
  iofAdicional?: Decimal.Value;
}

export interface ResultadoCalculo {
  cronograma: ScheduleItem[];
  totalJuros: Decimal;
  totalAPagar: Decimal;
  iof: Decimal;
  cetMes: Decimal;
  cetAno: Decimal;
}

/** Calcula cronograma + totais + IOF + CET para um conjunto de condições. */
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

  const iof =
    cond.iofDiario !== undefined && cond.iofAdicional !== undefined
      ? calcularIof({
          amortizacoes: cronograma.map((p) => ({
            valorPrincipal: p.valorPrincipal,
            vencimento: p.vencimento,
          })),
          dataContratacao: cond.dataContratacao,
          iofDiario: cond.iofDiario,
          iofAdicional: cond.iofAdicional,
        })
      : dec(0);

  // O IOF é um custo cobrado na liberação e, portanto, integra o CET.
  const tarifasTotais = money(dec(cond.tarifasIniciais ?? 0).plus(iof));

  const cet = calcularCet({
    valorLiberado: cond.valorPrincipal,
    parcelas: cronograma.map((p) => p.valorParcela),
    tarifasIniciais: tarifasTotais,
  });

  return {
    cronograma,
    totalJuros: totais.totalJuros,
    totalAPagar: totais.totalAPagar,
    iof,
    cetMes: cet.cetMes,
    cetAno: cet.cetAno,
  };
}
