import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmprestimoStatus, Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { EmprestimosService } from './emprestimos.service';
import {
  CancelarEmprestimoDto,
  CreateEmprestimoDto,
  SimularEmprestimoDto,
} from './dto/emprestimos.dto';

@ApiTags('emprestimos')
@ApiBearerAuth()
@Controller({ path: 'emprestimos', version: '1' })
export class EmprestimosController {
  constructor(private readonly emprestimos: EmprestimosService) {}

  // -------- Cliente --------
  @Get('meus')
  meus(@CurrentUser() user: AuthUser) {
    if (!user.clienteId) throw new ForbiddenException('Apenas clientes');
    return this.emprestimos.meusEmprestimos(user.clienteId);
  }

  @Get('meus/:id')
  meuDetalhe(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (!user.clienteId) throw new ForbiddenException('Apenas clientes');
    return this.emprestimos.buscarDoCliente(id, user.clienteId);
  }

  // -------- Back-office --------
  @Roles(Role.ADMIN, Role.ANALISTA)
  @HttpCode(HttpStatus.OK)
  @Post('simular')
  simular(@Body() dto: SimularEmprestimoDto) {
    return this.emprestimos.simular(dto);
  }

  @Roles(Role.ADMIN, Role.ANALISTA)
  @Post()
  criar(@Body() dto: CreateEmprestimoDto, @CurrentUser('sub') actorId: string) {
    return this.emprestimos.criar(dto, actorId);
  }

  @Roles(Role.ADMIN, Role.ANALISTA)
  @Get()
  listar(
    @Query('status') status?: EmprestimoStatus,
    @Query('clienteId') clienteId?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.emprestimos.listar({
      status,
      clienteId,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
    });
  }

  @Roles(Role.ADMIN, Role.ANALISTA)
  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.emprestimos.buscar(id);
  }

  @Roles(Role.ADMIN)
  @Post(':id/liberar')
  liberar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.emprestimos.liberar(id, actorId);
  }

  @Roles(Role.ADMIN)
  @Post(':id/cancelar')
  cancelar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarEmprestimoDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.emprestimos.cancelar(id, dto.motivo, actorId);
  }
}
