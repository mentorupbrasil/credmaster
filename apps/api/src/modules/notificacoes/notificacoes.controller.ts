import { Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ForbiddenException } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { NotificacoesService } from './notificacoes.service';

@ApiTags('notificacoes')
@ApiBearerAuth()
@Controller({ path: 'notificacoes', version: '1' })
export class NotificacoesController {
  constructor(private readonly notificacoes: NotificacoesService) {}

  @Get()
  listar(
    @CurrentUser() user: AuthUser,
    @Query('naoLidas') naoLidas?: string,
  ) {
    if (!user.clienteId) throw new ForbiddenException('Apenas clientes');
    return this.notificacoes.listarDoCliente(user.clienteId, naoLidas === 'true');
  }

  @Patch(':id/lida')
  marcarLida(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user.clienteId) throw new ForbiddenException('Apenas clientes');
    return this.notificacoes.marcarComoLida(id, user.clienteId);
  }
}
