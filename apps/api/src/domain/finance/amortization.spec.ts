import { gerarCronograma, totaisCronograma } from './amortization';
import { dec, sumMoney } from './money';

const dataInicio = new Date(Date.UTC(2026, 5, 1)); // 01/06/2026

describe('gerarCronograma', () => {
  describe('PRICE', () => {
    const itens = gerarCronograma({
      principal: 10000,
      taxaPeriodo: 0.02,
      prazo: 6,
      tipo: 'PRICE',
      dataInicio,
      diaVencimento: 1,
    });

    it('gera o número correto de parcelas', () => {
      expect(itens).toHaveLength(6);
    });

    it('tem parcelas (PMT) constantes', () => {
      const valores = new Set(itens.map((p) => p.valorParcela.toFixed(2)));
      // Pode haver 1 centavo de ajuste na última; aceitamos até 2 valores distintos.
      expect(valores.size).toBeLessThanOrEqual(2);
    });

    it('soma de principal é exatamente o valor emprestado', () => {
      const soma = sumMoney(itens.map((p) => p.valorPrincipal));
      expect(soma.toFixed(2)).toBe('10000.00');
    });

    it('zera o saldo devedor na última parcela', () => {
      expect(itens[itens.length - 1].saldoDevedorApos.toFixed(2)).toBe('0.00');
    });

    it('PMT bate com a fórmula (10000, 2%, 6) ~ 1785.26', () => {
      expect(itens[0].valorParcela.toFixed(2)).toBe('1785.26');
    });
  });

  describe('SAC', () => {
    const itens = gerarCronograma({
      principal: 12000,
      taxaPeriodo: 0.01,
      prazo: 12,
      tipo: 'SAC',
      dataInicio,
      diaVencimento: 10,
    });

    it('amortização constante de 1000', () => {
      itens.slice(0, 11).forEach((p) => {
        expect(p.valorPrincipal.toFixed(2)).toBe('1000.00');
      });
    });

    it('parcelas decrescentes (juros caem)', () => {
      for (let k = 1; k < itens.length; k++) {
        expect(itens[k].valorParcela.lte(itens[k - 1].valorParcela)).toBe(true);
      }
    });

    it('soma de principal exata e saldo final zero', () => {
      expect(sumMoney(itens.map((p) => p.valorPrincipal)).toFixed(2)).toBe('12000.00');
      expect(itens[itens.length - 1].saldoDevedorApos.toFixed(2)).toBe('0.00');
    });
  });

  describe('BULLET', () => {
    const itens = gerarCronograma({
      principal: 10000,
      taxaPeriodo: 0.03,
      prazo: 6,
      tipo: 'BULLET',
      dataInicio,
      diaVencimento: 1,
    });

    it('parcelas 1..5 são somente juros (300)', () => {
      itens.slice(0, 5).forEach((p) => {
        expect(p.tipo).toBe('JUROS');
        expect(p.valorPrincipal.toFixed(2)).toBe('0.00');
        expect(p.valorJuros.toFixed(2)).toBe('300.00');
        expect(p.saldoDevedorApos.toFixed(2)).toBe('10000.00');
      });
    });

    it('última parcela é principal + juros (10300)', () => {
      const ultima = itens[5];
      expect(ultima.tipo).toBe('PRINCIPAL');
      expect(ultima.valorParcela.toFixed(2)).toBe('10300.00');
      expect(ultima.saldoDevedorApos.toFixed(2)).toBe('0.00');
    });

    it('vencimentos caem no dia 1 dos meses seguintes', () => {
      expect(itens[0].vencimento.toISOString().slice(0, 10)).toBe('2026-07-01');
      expect(itens[5].vencimento.toISOString().slice(0, 10)).toBe('2026-12-01');
    });
  });

  describe('taxa zero', () => {
    it('PRICE com i=0 divide igualmente', () => {
      const itens = gerarCronograma({
        principal: 1000,
        taxaPeriodo: 0,
        prazo: 4,
        tipo: 'PRICE',
        dataInicio,
        diaVencimento: 5,
      });
      itens.forEach((p) => expect(p.valorParcela.toFixed(2)).toBe('250.00'));
    });
  });

  describe('totais', () => {
    it('total a pagar = principal + total de juros', () => {
      const itens = gerarCronograma({
        principal: 10000,
        taxaPeriodo: 0.02,
        prazo: 6,
        tipo: 'PRICE',
        dataInicio,
        diaVencimento: 1,
      });
      const t = totaisCronograma(itens);
      expect(t.totalAPagar.toFixed(2)).toBe(
        dec(10000).plus(t.totalJuros).toFixed(2),
      );
    });
  });
});
