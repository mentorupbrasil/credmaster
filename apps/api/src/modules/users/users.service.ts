import { ConflictException, Injectable } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { HashingService } from '../auth/hashing.service';
import { AuditService } from '../audit/audit.service';
import { CreateStaffDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
    private readonly audit: AuditService,
  ) {}

  async listarStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.ANALISTA] }, deletedAt: null },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        status: true,
        ultimoLoginEm: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async criarStaff(dto: CreateStaffDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await this.hashing.hashPassword(dto.senha);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        nome: dto.nome,
        passwordHash,
        role: dto.role,
        status: UserStatus.ATIVO,
      },
      select: { id: true, nome: true, email: true, role: true, status: true },
    });
    await this.audit.log({
      actorId,
      acao: 'STAFF_CRIADO',
      entidade: 'User',
      entidadeId: user.id,
      depois: { email: user.email, role: user.role },
    });
    return user;
  }

  async alterarStatus(id: string, status: UserStatus, actorId: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, nome: true, email: true, role: true, status: true },
    });
    await this.audit.log({
      actorId,
      acao: 'STAFF_STATUS_ALTERADO',
      entidade: 'User',
      entidadeId: id,
      depois: { status },
    });
    return user;
  }
}
