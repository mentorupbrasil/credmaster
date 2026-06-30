import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClienteStatus, Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import {
  CreateClienteDto,
  EnderecoDto,
  ListarClientesQuery,
  UpdateClienteDto,
} from './dto/clientes.dto';

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  async listar(query: ListarClientesQuery) {
    const where: Prisma.ClienteWhereInput = {
      deletedAt: null,
      status: query.status,
      ...(query.q
        ? {
            OR: [
              { nome: { contains: query.q, mode: 'insensitive' } },
              { cpf: { contains: query.q.replace(/\D/g, '') } },
              { email: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.cliente.count({ where }),
      this.prisma.cliente.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async buscar(id: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, deletedAt: null },
      include: {
        enderecos: true,
        emprestimos: {
          select: {
            id: true,
            numeroContrato: true,
            valorPrincipal: true,
            status: true,
            dataFinal: true,
          },
        },
      },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    return cliente;
  }

  async criar(dto: CreateClienteDto, actorId: string) {
    const cliente = await this.prisma.cliente.create({
      data: {
        nome: dto.nome,
        cpf: dto.cpf,
        telefone: dto.telefone,
        email: dto.email.toLowerCase(),
        rg: dto.rg,
        rendaMensal: dto.rendaMensal,
        dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : null,
        status: ClienteStatus.EM_ANALISE,
      },
    });
    await this.audit.log({
      actorId,
      acao: 'CLIENTE_CRIADO',
      entidade: 'Cliente',
      entidadeId: cliente.id,
      depois: cliente,
    });
    return cliente;
  }

  async atualizar(id: string, dto: UpdateClienteDto, actorId: string) {
    const antes = await this.buscar(id);
    const cliente = await this.prisma.cliente.update({
      where: { id },
      data: {
        ...dto,
        email: dto.email?.toLowerCase(),
        dataNascimento: dto.dataNascimento
          ? new Date(dto.dataNascimento)
          : undefined,
      },
    });
    await this.audit.log({
      actorId,
      acao: 'CLIENTE_ATUALIZADO',
      entidade: 'Cliente',
      entidadeId: id,
      antes,
      depois: cliente,
    });
    return cliente;
  }

  async aprovar(id: string, actorId: string) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    if (cliente.status === ClienteStatus.APROVADO) return cliente;
    if (
      ![ClienteStatus.PENDENTE, ClienteStatus.EM_ANALISE].includes(cliente.status)
    ) {
      throw new BadRequestException(
        `Não é possível aprovar um cliente com status ${cliente.status}`,
      );
    }

    const atualizado = await this.prisma.$transaction(async (tx) => {
      const c = await tx.cliente.update({
        where: { id },
        data: {
          status: ClienteStatus.APROVADO,
          aprovadoPor: actorId,
          aprovadoEm: new Date(),
          motivoReprovacao: null,
        },
      });
      await tx.user.updateMany({
        where: { clienteId: id },
        data: { status: UserStatus.ATIVO },
      });
      await this.audit.log(
        {
          actorId,
          acao: 'CLIENTE_APROVADO',
          entidade: 'Cliente',
          entidadeId: id,
        },
        tx,
      );
      await this.notificacoes.criar(
        {
          clienteId: id,
          tipo: 'CADASTRO_APROVADO',
          titulo: 'Cadastro aprovado',
          mensagem: 'Seu cadastro foi aprovado. Você já pode contratar crédito.',
        },
        tx,
      );
      return c;
    });
    return atualizado;
  }

  async reprovar(id: string, motivo: string, actorId: string) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');

    const atualizado = await this.prisma.$transaction(async (tx) => {
      const c = await tx.cliente.update({
        where: { id },
        data: {
          status: ClienteStatus.REPROVADO,
          motivoReprovacao: motivo,
        },
      });
      await this.audit.log(
        {
          actorId,
          acao: 'CLIENTE_REPROVADO',
          entidade: 'Cliente',
          entidadeId: id,
          depois: { motivo },
        },
        tx,
      );
      await this.notificacoes.criar(
        {
          clienteId: id,
          tipo: 'CADASTRO_REPROVADO',
          titulo: 'Cadastro reprovado',
          mensagem: `Seu cadastro foi reprovado. Motivo: ${motivo}`,
        },
        tx,
      );
      return c;
    });
    return atualizado;
  }

  async alterarBloqueio(id: string, bloquear: boolean, actorId: string) {
    const cliente = await this.prisma.cliente.update({
      where: { id },
      data: { status: bloquear ? ClienteStatus.BLOQUEADO : ClienteStatus.APROVADO },
    });
    await this.audit.log({
      actorId,
      acao: bloquear ? 'CLIENTE_BLOQUEADO' : 'CLIENTE_DESBLOQUEADO',
      entidade: 'Cliente',
      entidadeId: id,
    });
    return cliente;
  }

  async adicionarEndereco(clienteId: string, dto: EnderecoDto) {
    await this.buscar(clienteId);
    const principal = dto.principal ?? true;
    if (principal) {
      await this.prisma.endereco.updateMany({
        where: { clienteId },
        data: { principal: false },
      });
    }
    return this.prisma.endereco.create({
      data: { ...dto, clienteId, principal },
    });
  }

  async meuPerfil(clienteId: string) {
    return this.buscar(clienteId);
  }
}
