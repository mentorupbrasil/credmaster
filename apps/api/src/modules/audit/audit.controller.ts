import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('auditoria')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller({ path: 'auditoria', version: '1' })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(
    @Query('entidade') entidade?: string,
    @Query('entidadeId') entidadeId?: string,
    @Query('take') take?: string,
  ) {
    return this.auditService.list({
      entidade,
      entidadeId,
      take: take ? parseInt(take, 10) : undefined,
    });
  }
}
