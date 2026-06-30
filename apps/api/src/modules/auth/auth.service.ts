import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { HashingService } from './hashing.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly hashing: HashingService,
    private readonly audit: AuditService,
  ) {}

  /** Auto-cadastro do cliente: cria Cliente PENDENTE + usuário CLIENTE. */
  async register(dto: RegisterDto, meta: RequestMeta) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const cpfExists = await this.prisma.cliente.findUnique({
      where: { cpf: dto.cpf },
    });
    if (cpfExists) throw new ConflictException('CPF já cadastrado');

    const passwordHash = await this.hashing.hashPassword(dto.senha);

    const user = await this.prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.create({
        data: {
          nome: dto.nome,
          cpf: dto.cpf,
          telefone: dto.telefone,
          email: dto.email.toLowerCase(),
          status: 'PENDENTE',
        },
      });
      const created = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          nome: dto.nome,
          role: Role.CLIENTE,
          clienteId: cliente.id,
        },
      });
      await this.audit.log(
        {
          actorId: created.id,
          acao: 'CLIENTE_AUTO_CADASTRO',
          entidade: 'Cliente',
          entidadeId: cliente.id,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
        tx,
      );
      return created;
    });

    const tokens = await this.issueTokens(
      { id: user.id, email: user.email, role: user.role, clienteId: user.clienteId },
      meta,
    );
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async login(dto: LoginDto, meta: RequestMeta) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    if (user.bloqueadoAte && user.bloqueadoAte > new Date()) {
      throw new UnauthorizedException(
        'Conta temporariamente bloqueada por tentativas excessivas',
      );
    }
    if (user.status !== UserStatus.ATIVO) {
      throw new UnauthorizedException('Conta inativa ou bloqueada');
    }

    const ok = await this.hashing.verifyPassword(user.passwordHash, dto.senha);
    if (!ok) {
      await this.registrarFalhaLogin(user.id, user.tentativasFalhas);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { tentativasFalhas: 0, bloqueadoAte: null, ultimoLoginEm: new Date() },
    });

    const tokens = await this.issueTokens(
      { id: user.id, email: user.email, role: user.role, clienteId: user.clienteId },
      meta,
    );
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async refresh(refreshToken: string, meta: RequestMeta) {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const tokenHash = this.hashing.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão inválida');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== UserStatus.ATIVO) {
      throw new UnauthorizedException('Usuário inválido');
    }

    // Rotação: revoga o token atual e emite um novo.
    const tokens = await this.issueTokens(
      { id: user.id, email: user.email, role: user.role, clienteId: user.clienteId },
      meta,
    );
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: {
        revokedAt: new Date(),
        replacedBy: this.hashing.hashToken(tokens.refreshToken),
      },
    });
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashing.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, userId },
        data: { revokedAt: new Date() },
      });
    } else {
      // Revoga todas as sessões do usuário
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { sucesso: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { cliente: true },
    });
    if (!user) throw new UnauthorizedException();
    return {
      ...this.toPublicUser(user),
      cliente: user.cliente
        ? {
            id: user.cliente.id,
            nome: user.cliente.nome,
            status: user.cliente.status,
          }
        : null,
    };
  }

  // ---------- helpers ----------

  private async issueTokens(
    user: { id: string; email: string; role: Role; clienteId: string | null },
    meta: RequestMeta,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      clienteId: user.clienteId,
    };
    const accessTtl = this.config.get<number>('jwt.accessTtl', 900);
    const refreshTtl = this.config.get<number>('jwt.refreshTtl', 2592000);

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: accessTtl,
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: randomUUID() },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: refreshTtl,
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashing.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return { accessToken, refreshToken, expiresIn: accessTtl };
  }

  private async registrarFalhaLogin(userId: string, atual: number) {
    const tentativas = atual + 1;
    const bloquear = tentativas >= MAX_TENTATIVAS;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tentativasFalhas: tentativas,
        bloqueadoAte: bloquear
          ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000)
          : null,
      },
    });
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    nome: string;
    role: Role;
    clienteId: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
      clienteId: user.clienteId,
    };
  }
}
