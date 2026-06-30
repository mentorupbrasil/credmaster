import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { AlterarStatusDto, CreateStaffDto } from './dto/users.dto';

@ApiTags('usuarios')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller({ path: 'usuarios', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  listar() {
    return this.users.listarStaff();
  }

  @Post()
  criar(@Body() dto: CreateStaffDto, @CurrentUser('sub') actorId: string) {
    return this.users.criarStaff(dto, actorId);
  }

  @Patch(':id/status')
  alterarStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AlterarStatusDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.users.alterarStatus(id, dto.status, actorId);
  }
}
