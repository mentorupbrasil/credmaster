import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RelatoriosService } from './relatorios.service';

@ApiTags('relatorios')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.ANALISTA)
@Controller({ path: 'relatorios', version: '1' })
export class RelatoriosController {
  constructor(private readonly relatorios: RelatoriosService) {}

  @Get('carteira')
  carteira() {
    return this.relatorios.carteira();
  }

  @Get('inadimplencia')
  inadimplencia() {
    return this.relatorios.inadimplencia();
  }

  @Get('recebimentos')
  recebimentos(@Query('de') de?: string, @Query('ate') ate?: string) {
    return this.relatorios.recebimentos(de, ate);
  }
}
