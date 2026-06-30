import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { ClientesService } from './clientes.service';
import {
  CreateClienteDto,
  EnderecoDto,
  ListarClientesQuery,
  ReprovarClienteDto,
  UpdateClienteDto,
} from './dto/clientes.dto';

@ApiTags('clientes')
@ApiBearerAuth()
@Controller({ path: 'clientes', version: '1' })
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  // -------- Autoatendimento do cliente --------
  @Get('me')
  meuPerfil(@CurrentUser() user: AuthUser) {
    if (!user.clienteId) throw new ForbiddenException('Apenas clientes');
    return this.clientes.meuPerfil(user.clienteId);
  }

  @Post('me/enderecos')
  meuEndereco(@CurrentUser() user: AuthUser, @Body() dto: EnderecoDto) {
    if (!user.clienteId) throw new ForbiddenException('Apenas clientes');
    return this.clientes.adicionarEndereco(user.clienteId, dto);
  }

  // LGPD: titular exporta os próprios dados.
  @Get('me/dados')
  meusDados(@CurrentUser() user: AuthUser) {
    if (!user.clienteId) throw new ForbiddenException('Apenas clientes');
    return this.clientes.exportarDados(user.clienteId, user.sub);
  }

  // -------- Back-office (ADMIN / ANALISTA) --------
  @Roles(Role.ADMIN, Role.ANALISTA)
  @Get()
  listar(@Query() query: ListarClientesQuery) {
    return this.clientes.listar(query);
  }

  @Roles(Role.ADMIN, Role.ANALISTA)
  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientes.buscar(id);
  }

  @Roles(Role.ADMIN, Role.ANALISTA)
  @Post()
  criar(@Body() dto: CreateClienteDto, @CurrentUser('sub') actorId: string) {
    return this.clientes.criar(dto, actorId);
  }

  @Roles(Role.ADMIN, Role.ANALISTA)
  @Put(':id')
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClienteDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.clientes.atualizar(id, dto, actorId);
  }

  @Roles(Role.ADMIN, Role.ANALISTA)
  @Post(':id/aprovar')
  aprovar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.clientes.aprovar(id, actorId);
  }

  @Roles(Role.ADMIN, Role.ANALISTA)
  @Post(':id/reprovar')
  reprovar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReprovarClienteDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.clientes.reprovar(id, dto.motivo, actorId);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/bloquear')
  bloquear(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.clientes.alterarBloqueio(id, true, actorId);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/desbloquear')
  desbloquear(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.clientes.alterarBloqueio(id, false, actorId);
  }

  @Roles(Role.ADMIN, Role.ANALISTA)
  @Post(':id/enderecos')
  adicionarEndereco(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnderecoDto,
  ) {
    return this.clientes.adicionarEndereco(id, dto);
  }

  // -------- LGPD --------
  @Roles(Role.ADMIN, Role.ANALISTA)
  @Get(':id/dados')
  exportarDados(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.clientes.exportarDados(id, actorId);
  }

  @Roles(Role.ADMIN)
  @Post(':id/anonimizar')
  anonimizar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.clientes.anonimizar(id, actorId);
  }
}
