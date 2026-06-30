import { calcularEncargos } from './mora';

describe('calcularEncargos', () => {
  const vencimento = new Date(Date.UTC(2026, 6, 1)); // 01/07/2026

  it('sem atraso retorna zero', () => {
    const r = calcularEncargos({
      valorEmAberto: 1000,
      vencimento,
      referencia: vencimento,
      multaPercent: 0.02,
      jurosMoraMesPercent: 0.01,
    });
    expect(r.diasAtraso).toBe(0);
    expect(r.total.toFixed(2)).toBe('0.00');
  });

  it('multa única de 2% + mora pro-rata por 30 dias', () => {
    const referencia = new Date(Date.UTC(2026, 6, 31)); // 30 dias depois
    const r = calcularEncargos({
      valorEmAberto: 1000,
      vencimento,
      referencia,
      multaPercent: 0.02,
      jurosMoraMesPercent: 0.01,
    });
    expect(r.diasAtraso).toBe(30);
    expect(r.multa.toFixed(2)).toBe('20.00'); // 2% de 1000
    // mora = 1000 * (0.01/30) * 30 = 10.00
    expect(r.jurosMora.toFixed(2)).toBe('10.00');
    expect(r.total.toFixed(2)).toBe('30.00');
  });

  it('mora cresce linearmente com os dias', () => {
    const r10 = calcularEncargos({
      valorEmAberto: 3000,
      vencimento,
      referencia: new Date(Date.UTC(2026, 6, 11)),
      multaPercent: 0.02,
      jurosMoraMesPercent: 0.03,
    });
    expect(r10.diasAtraso).toBe(10);
    // mora = 3000 * (0.03/30) * 10 = 30.00
    expect(r10.jurosMora.toFixed(2)).toBe('30.00');
    expect(r10.multa.toFixed(2)).toBe('60.00');
  });

  it('valor em aberto zero não gera encargos', () => {
    const r = calcularEncargos({
      valorEmAberto: 0,
      vencimento,
      referencia: new Date(Date.UTC(2026, 7, 1)),
      multaPercent: 0.02,
      jurosMoraMesPercent: 0.01,
    });
    expect(r.total.toFixed(2)).toBe('0.00');
  });
});
