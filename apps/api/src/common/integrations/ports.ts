/**
 * Portas (interfaces) de integração com sistemas externos.
 * Implementações reais devem substituir os stubs registrados no
 * IntegrationsModule, sem alterar os serviços de domínio que dependem delas.
 */

// ---------------- Bureau de crédito ----------------
export interface ConsultaBureauInput {
  cpf: string;
  nome?: string;
}
export interface ResultadoBureau {
  score: number; // 0-1000
  possuiRestricoes: boolean;
  rendaPresumida?: number;
  fonte: string;
  consultadoEm: string;
}
export interface CreditBureauPort {
  consultar(input: ConsultaBureauInput): Promise<ResultadoBureau>;
}
export const CREDIT_BUREAU = Symbol('CREDIT_BUREAU');

// ---------------- Gateway de pagamento ----------------
export interface CobrancaInput {
  emprestimoId: string;
  parcelaId?: string;
  valor: number;
  vencimento: string;
  pagador: { nome: string; cpf: string; email?: string };
  metodo: 'PIX' | 'BOLETO';
}
export interface CobrancaCriada {
  id: string;
  status: 'PENDENTE' | 'PAGO' | 'CANCELADO';
  linhaDigitavel?: string;
  pixCopiaECola?: string;
  url?: string;
}
export interface PaymentGatewayPort {
  criarCobranca(input: CobrancaInput): Promise<CobrancaCriada>;
  consultarCobranca(id: string): Promise<CobrancaCriada>;
}
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

// ---------------- Antifraude ----------------
export interface AvaliacaoFraudeInput {
  clienteId: string;
  valor: number;
  ip?: string;
  dispositivo?: string;
}
export interface AvaliacaoFraude {
  risco: 'BAIXO' | 'MEDIO' | 'ALTO';
  pontuacao: number;
  recomendacao: 'APROVAR' | 'REVISAR' | 'NEGAR';
}
export interface AntifraudPort {
  avaliar(input: AvaliacaoFraudeInput): Promise<AvaliacaoFraude>;
}
export const ANTIFRAUD = Symbol('ANTIFRAUD');

// ---------------- KYC / armazenamento de documentos ----------------
export interface ArquivoUploadInput {
  clienteId: string;
  tipo: string;
  nomeArquivo: string;
  contentType: string;
}
export interface ArquivoArmazenado {
  url: string;
  chave: string;
  uploadUrl?: string; // URL pré-assinada para upload direto
}
export interface KycStoragePort {
  gerarUploadUrl(input: ArquivoUploadInput): Promise<ArquivoArmazenado>;
}
export const KYC_STORAGE = Symbol('KYC_STORAGE');
