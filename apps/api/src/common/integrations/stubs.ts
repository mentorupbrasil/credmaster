import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AntifraudPort,
  ArquivoArmazenado,
  ArquivoUploadInput,
  AvaliacaoFraude,
  AvaliacaoFraudeInput,
  CobrancaCriada,
  CobrancaInput,
  ConsultaBureauInput,
  CreditBureauPort,
  KycStoragePort,
  PaymentGatewayPort,
  ResultadoBureau,
} from './ports';

/**
 * Stubs determinísticos para desenvolvimento/testes. NÃO realizam chamadas
 * externas. Em produção, registre implementações reais no IntegrationsModule.
 */

@Injectable()
export class StubCreditBureau implements CreditBureauPort {
  private readonly logger = new Logger(StubCreditBureau.name);
  async consultar(input: ConsultaBureauInput): Promise<ResultadoBureau> {
    this.logger.warn(`[STUB] Consulta bureau para CPF ${input.cpf}`);
    // Score pseudo-determinístico a partir do CPF.
    const digits = input.cpf.replace(/\D/g, '');
    const seed = digits.split('').reduce((a, c) => a + Number(c), 0);
    const score = 300 + (seed % 7) * 100;
    return {
      score,
      possuiRestricoes: score < 500,
      fonte: 'stub',
      consultadoEm: new Date().toISOString(),
    };
  }
}

@Injectable()
export class StubPaymentGateway implements PaymentGatewayPort {
  private readonly logger = new Logger(StubPaymentGateway.name);
  async criarCobranca(input: CobrancaInput): Promise<CobrancaCriada> {
    this.logger.warn(`[STUB] Cobrança ${input.metodo} de ${input.valor}`);
    const id = randomUUID();
    return {
      id,
      status: 'PENDENTE',
      pixCopiaECola:
        input.metodo === 'PIX' ? `000201...${id.slice(0, 8)}` : undefined,
      linhaDigitavel:
        input.metodo === 'BOLETO'
          ? '00000.00000 00000.000000 00000.000000 0 00000000000000'
          : undefined,
    };
  }
  async consultarCobranca(id: string): Promise<CobrancaCriada> {
    return { id, status: 'PENDENTE' };
  }
}

@Injectable()
export class StubAntifraud implements AntifraudPort {
  private readonly logger = new Logger(StubAntifraud.name);
  async avaliar(input: AvaliacaoFraudeInput): Promise<AvaliacaoFraude> {
    this.logger.warn(`[STUB] Antifraude cliente ${input.clienteId}`);
    return { risco: 'BAIXO', pontuacao: 10, recomendacao: 'APROVAR' };
  }
}

@Injectable()
export class StubKycStorage implements KycStoragePort {
  private readonly logger = new Logger(StubKycStorage.name);
  async gerarUploadUrl(input: ArquivoUploadInput): Promise<ArquivoArmazenado> {
    this.logger.warn(`[STUB] Upload KYC ${input.tipo} cliente ${input.clienteId}`);
    const chave = `kyc/${input.clienteId}/${randomUUID()}-${input.nomeArquivo}`;
    return {
      chave,
      url: `https://storage.local/${chave}`,
      uploadUrl: `https://storage.local/upload/${chave}`,
    };
  }
}
