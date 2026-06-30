import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParametrosService } from './parametros.service';

class UpsertParametroDto {
  @IsString()
  @IsNotEmpty()
  chave!: string;

  @IsString()
  @IsNotEmpty()
  valor!: string;

  @IsString()
  @IsOptional()
  descricao?: string;
}

@ApiTags('parametros')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller({ path: 'parametros', version: '1' })
export class ParametrosController {
  constructor(private readonly parametros: ParametrosService) {}

  @Get()
  list() {
    return this.parametros.list();
  }

  @Put()
  upsert(@Body() dto: UpsertParametroDto, @CurrentUser('sub') actorId: string) {
    return this.parametros.set(dto.chave, dto.valor, dto.descricao, actorId);
  }
}
