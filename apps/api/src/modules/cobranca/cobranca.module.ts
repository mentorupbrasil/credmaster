import { Module } from '@nestjs/common';
import { CobrancaService } from './cobranca.service';
import { CobrancaController } from './cobranca.controller';
import { CronController } from './cron.controller';

@Module({
  controllers: [CobrancaController, CronController],
  providers: [CobrancaService],
  exports: [CobrancaService],
})
export class CobrancaModule {}
