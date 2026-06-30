import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/** Valida CPF (com dígitos verificadores). Aceita somente dígitos ou formatado. */
export function isValidCpf(value: string): boolean {
  if (!value) return false;
  const cpf = value.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  // Rejeita sequências repetidas (00000000000, 11111111111, ...)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (slice: string, factorStart: number): number => {
    let total = 0;
    let factor = factorStart;
    for (const ch of slice) {
      total += parseInt(ch, 10) * factor;
      factor--;
    }
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const d1 = calcDigit(cpf.slice(0, 9), 10);
  if (d1 !== parseInt(cpf[9], 10)) return false;
  const d2 = calcDigit(cpf.slice(0, 10), 11);
  return d2 === parseInt(cpf[10], 10);
}

export function IsCPF(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCpf',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isValidCpf(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} deve ser um CPF válido`;
        },
      },
    });
  };
}
