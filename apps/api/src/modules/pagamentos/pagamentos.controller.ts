import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PagamentosService } from './pagamentos.service';
import {
  EstornarPagamentoDto,
  RegistrarPagamentoDto,
} from './dto/pagamentos.dto';

@ApiTags('pagamentos')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.ANALISTA)
@Controller({ version: '1' })
export class PagamentosController {
  constructor(private readonly pagamentos: PagamentosService) {}

  @Get('pagamentos')
  listarTodos(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '30',
  ) {
    return this.pagamentos.listarTodos(parseInt(page, 10), parseInt(pageSize, 10));
  }

  @Post('emprestimos/:emprestimoId/pagamentos')
  registrar(
    @Param('emprestimoId', ParseUUIDPipe) emprestimoId: string,
    @Body() dto: RegistrarPagamentoDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.pagamentos.registrar(emprestimoId, dto, actorId);
  }

  @Get('emprestimos/:emprestimoId/pagamentos')
  listar(@Param('emprestimoId', ParseUUIDPipe) emprestimoId: string) {
    return this.pagamentos.listarDoEmprestimo(emprestimoId);
  }

  @Roles(Role.ADMIN)
  @Post('pagamentos/:id/estornar')
  estornar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EstornarPagamentoDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.pagamentos.estornar(id, dto.motivo, actorId);
  }
}
