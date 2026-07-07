import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CobrancaService } from './cobranca.service';
import { toUtcDate } from '../../domain/finance/dates';

class ExecutarCobrancaDto {
  @IsOptional()
  @IsString()
  referencia?: string; // YYYY-MM-DD (para reprocessamento/backfill)
}

@ApiTags('cobranca')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller({ path: 'cobranca', version: '1' })
export class CobrancaController {
  constructor(
    private readonly cobranca: CobrancaService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('atrasados')
  listarAtrasados() {
    return this.cobranca.listarAtrasados();
  }

  @HttpCode(HttpStatus.OK)
  @Post('executar')
  executar(
    @Body() dto: ExecutarCobrancaDto,
    @CurrentUser('sub') actorId: string,
  ) {
    const ref = dto.referencia ? toUtcDate(dto.referencia) : new Date();
    return this.cobranca.executar(ref, true, actorId);
  }

  @Get('execucoes')
  execucoes(@Query('take') take = '30') {
    return this.prisma.jobExecution.findMany({
      orderBy: { iniciadoEm: 'desc' },
      take: parseInt(take, 10),
    });
  }
}
