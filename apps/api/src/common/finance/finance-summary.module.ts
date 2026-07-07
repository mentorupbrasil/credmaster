import { Global, Module } from '@nestjs/common';
import { FinanceSummaryService } from './finance-summary.service';

@Global()
@Module({
  providers: [FinanceSummaryService],
  exports: [FinanceSummaryService],
})
export class FinanceSummaryModule {}
