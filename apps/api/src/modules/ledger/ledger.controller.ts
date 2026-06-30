import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { LedgerService } from './ledger.service';

@ApiTags('ledger')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.ANALISTA)
@Controller({ path: 'emprestimos/:emprestimoId/extrato', version: '1' })
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get()
  extrato(@Param('emprestimoId', ParseUUIDPipe) emprestimoId: string) {
    return this.ledger.extrato(emprestimoId);
  }
}
