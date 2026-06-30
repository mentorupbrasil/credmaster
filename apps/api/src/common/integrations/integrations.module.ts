import { Global, Module } from '@nestjs/common';
import {
  ANTIFRAUD,
  CREDIT_BUREAU,
  KYC_STORAGE,
  PAYMENT_GATEWAY,
} from './ports';
import {
  StubAntifraud,
  StubCreditBureau,
  StubKycStorage,
  StubPaymentGateway,
} from './stubs';

/**
 * Registra as portas de integração. Para produção, troque os `useClass`
 * por implementações reais (Serasa/Boa Vista, gateway PIX/boleto, etc.).
 */
@Global()
@Module({
  providers: [
    { provide: CREDIT_BUREAU, useClass: StubCreditBureau },
    { provide: PAYMENT_GATEWAY, useClass: StubPaymentGateway },
    { provide: ANTIFRAUD, useClass: StubAntifraud },
    { provide: KYC_STORAGE, useClass: StubKycStorage },
  ],
  exports: [CREDIT_BUREAU, PAYMENT_GATEWAY, ANTIFRAUD, KYC_STORAGE],
})
export class IntegrationsModule {}
