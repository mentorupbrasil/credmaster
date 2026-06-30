import { isValidCpf } from './is-cpf.validator';

describe('isValidCpf', () => {
  it('aceita CPFs válidos (com e sem formatação)', () => {
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('529.982.247-25')).toBe(true);
  });

  it('rejeita dígito verificador inválido', () => {
    expect(isValidCpf('52998224724')).toBe(false);
    expect(isValidCpf('12345678901')).toBe(false);
  });

  it('rejeita sequências repetidas', () => {
    expect(isValidCpf('00000000000')).toBe(false);
    expect(isValidCpf('11111111111')).toBe(false);
  });

  it('rejeita tamanho incorreto e vazio', () => {
    expect(isValidCpf('123')).toBe(false);
    expect(isValidCpf('')).toBe(false);
  });
});
