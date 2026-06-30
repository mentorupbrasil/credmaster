import { calcularCet, irr } from './cet';
import { gerarCronograma } from './amortization';

describe('CET', () => {
  it('sem tarifas, CET ~ taxa contratual (PRICE 2% a.m.)', () => {
    const itens = gerarCronograma({
      principal: 10000,
      taxaPeriodo: 0.02,
      prazo: 6,
      tipo: 'PRICE',
      dataInicio: new Date(Date.UTC(2026, 5, 1)),
      diaVencimento: 1,
    });
    const cet = calcularCet({
      valorLiberado: 10000,
      parcelas: itens.map((p) => p.valorParcela),
    });
    // Deve ficar muito próximo de 2% a.m.
    expect(Number(cet.cetMes.toString())).toBeCloseTo(0.02, 4);
  });

  it('com tarifa inicial o CET fica acima da taxa contratual', () => {
    const itens = gerarCronograma({
      principal: 10000,
      taxaPeriodo: 0.02,
      prazo: 6,
      tipo: 'PRICE',
      dataInicio: new Date(Date.UTC(2026, 5, 1)),
      diaVencimento: 1,
    });
    const cet = calcularCet({
      valorLiberado: 10000,
      parcelas: itens.map((p) => p.valorParcela),
      tarifasIniciais: 300,
    });
    expect(Number(cet.cetMes.toString())).toBeGreaterThan(0.02);
  });

  it('CET ao ano é a capitalização do mensal', () => {
    const cet = calcularCet({
      valorLiberado: 1000,
      parcelas: [1020],
    });
    // 1 parcela de 1020 sobre 1000 => 2% no período
    expect(Number(cet.cetMes.toString())).toBeCloseTo(0.02, 4);
    const esperadoAno = Math.pow(1.02, 12) - 1;
    expect(Number(cet.cetAno.toString())).toBeCloseTo(esperadoAno, 3);
  });

  it('irr resolve fluxo simples', () => {
    const r = irr([-1000, 0, 0, 1000 * Math.pow(1.05, 3)]);
    expect(r).toBeCloseTo(0.05, 4);
  });
});
