import { brl } from '@/lib/format';

export interface EmprestimoResumo {
  saldoDevedor?: number | string;
  diasAtraso?: number;
  encargosAcumulados?: number | string;
  proximoVencimento?: string;
  valorProximaParcela?: number | string;
}

export interface ParcelaAberta {
  id: string;
  numero: number;
  valorParcela: number | string;
  multa: number | string;
  jurosMora: number | string;
  valorPago: number | string;
  status: string;
}

export function calcValorEmAberto(parcela: ParcelaAberta): number {
  return (
    Number(parcela.valorParcela) +
    Number(parcela.multa) +
    Number(parcela.jurosMora) -
    Number(parcela.valorPago)
  );
}

export function findParcelaAberta(parcelas: ParcelaAberta[] | undefined): ParcelaAberta | undefined {
  return parcelas?.find((p) => p.status !== 'PAGA' && p.status !== 'CANCELADA');
}

export const FORMAS_PAGAMENTO = [
  { value: 'PIX', label: 'PIX' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'TED', label: 'TED' },
  { value: 'DOC', label: 'DOC' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'CARTAO', label: 'Cartão' },
  { value: 'OUTRO', label: 'Outro' },
] as const;

export function whatsappLink(telefone: string, mensagem: string): string {
  const digits = telefone.replace(/\D/g, '');
  const phone = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`;
}

export function mensagemCobranca(
  nome: string,
  valorAtualizado: number | string,
  dataVencimento: string,
): string {
  return `Olá, ${nome}. Tudo bem? Estou passando para lembrar que seu contrato no valor de ${brl(valorAtualizado)} está em aberto desde ${dataVencimento}. Poderia me dar um retorno sobre o pagamento?`;
}

export function tierAtraso(dias: number): 'leve' | 'moderado' | 'critico' {
  if (dias <= 7) return 'leve';
  if (dias <= 30) return 'moderado';
  return 'critico';
}
