import { calcularIof } from './iof';
import { dec } from './money';

describe('calcularIof', () => {
  const dataContratacao = new Date(Date.UTC(2026, 0, 1));

  it('aplica IOF adicional fixo sobre o principal', () => {
    // Sem dias corridos (vencimento = contratação) -> só o adicional.
    const iof = calcularIof({
      amortizacoes: [{ valorPrincipal: 1000, vencimento: dataContratacao }],
      dataContratacao,
      iofDiario: 0, // zera a parcela diária
      iofAdicional: 0.0038, // 0,38%
    });
    expect(iof.toFixed(2)).toBe('3.80');
  });

  it('aplica IOF diário proporcional aos dias até o vencimento', () => {
    const vencimento = new Date(Date.UTC(2026, 0, 31)); // 30 dias
    const iof = calcularIof({
      amortizacoes: [{ valorPrincipal: 1000, vencimento }],
      dataContratacao,
      iofDiario: 0.000082, // 0,0082% a.d.
      iofAdicional: 0,
    });
    // 1000 * 0.000082 * 30 = 2.46
    expect(iof.toFixed(2)).toBe('2.46');
  });

  it('limita o IOF diário a 365 dias por parcela', () => {
    const vencimento = new Date(Date.UTC(2030, 0, 1)); // muito além de 365d
    const iof = calcularIof({
      amortizacoes: [{ valorPrincipal: 1000, vencimento }],
      dataContratacao,
      iofDiario: 0.000082,
      iofAdicional: 0,
    });
    // cap: 1000 * 0.000082 * 365 = 29.93
    expect(dec(iof).lte(dec('29.93'))).toBe(true);
    expect(iof.toFixed(2)).toBe('29.93');
  });
});
