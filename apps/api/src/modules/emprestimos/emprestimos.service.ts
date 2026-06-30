import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClienteStatus,
  EmprestimoStatus,
  LedgerDirecao,
  LedgerTipo,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { ParametrosService } from '../parametros/parametros.service';
import {
  dec,
  money,
  percentToRate,
  nonNegative,
  sumMoney,
  Decimal,
} from '../../domain/finance/money';
import { diffDays, toUtcDate } from '../../domain/finance/dates';
import { calcularEmprestimo } from './emprestimos.calc';
import {
  CreateEmprestimoDto,
  SimularEmprestimoDto,
} from './dto/emprestimos.dto';

@Injectable()
export class EmprestimosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly notificacoes: NotificacoesService,
    private readonly parametros: ParametrosService,
  ) {}

  // -------------------------------------------------------------------------
  // Simulação (não persiste)
  // -------------------------------------------------------------------------
  simular(dto: SimularEmprestimoDto) {
    const dataContratacao = dto.dataContratacao
      ? toUtcDate(dto.dataContratacao)
      : toUtcDate(new Date());

    const r = calcularEmprestimo({
      valorPrincipal: dto.valorPrincipal,
      taxaJurosMesPercent: dto.taxaJurosMes,
      tipoAmortizacao: dto.tipoAmortizacao,
      prazoMeses: dto.prazoMeses,
      diaVencimento: dto.diaVencimento,
      dataContratacao,
      tarifasIniciais: dto.tarifasIniciais,
    });

    return {
      condicoes: {
        valorPrincipal: money(dto.valorPrincipal),
        taxaJurosMes: dec(dto.taxaJurosMes),
        tipoAmortizacao: dto.tipoAmortizacao,
        prazoMeses: dto.prazoMeses,
        diaVencimento: dto.diaVencimento,
        dataContratacao,
      },
      totalJuros: r.totalJuros,
      totalAPagar: r.totalAPagar,
      cetMes: r.cetMes,
      cetAno: r.cetAno,
      cronograma: r.cronograma.map((p) => ({
        numero: p.numero,
        tipo: p.tipo,
        vencimento: p.vencimento,
        valorPrincipal: p.valorPrincipal,
        valorJuros: p.valorJuros,
        valorParcela: p.valorParcela,
        saldoDevedorApos: p.saldoDevedorApos,
      })),
    };
  }

  // -------------------------------------------------------------------------
  // Criação
  // -------------------------------------------------------------------------
  async criar(dto: CreateEmprestimoDto, actorId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    if (cliente.status !== ClienteStatus.APROVADO) {
      throw new BadRequestException(
        'Só é possível conceder crédito a clientes APROVADOS',
      );
    }

    const limites = await this.parametros.getLimitesRegulatorios();
    const multaFrac =
      dto.multaAtrasoPercent !== undefined
        ? percentToRate(dec(dto.multaAtrasoPercent))
        : limites.multaMax;
    const moraFrac =
      dto.jurosMoraMesPercent !== undefined
        ? percentToRate(dec(dto.jurosMoraMesPercent))
        : limites.jurosMoraMaxMes;

    if (multaFrac.gt(limites.multaMax)) {
      throw new BadRequestException(
        `Multa por atraso acima do limite legal (${limites.multaMax.mul(100)}%)`,
      );
    }
    if (moraFrac.gt(limites.jurosMoraMaxMes)) {
      throw new BadRequestException(
        `Juros de mora acima do limite legal (${limites.jurosMoraMaxMes.mul(100)}% a.m.)`,
      );
    }

    // Validação contra o produto (se informado)
    if (dto.produtoId) {
      const produto = await this.prisma.produtoCredito.findUnique({
        where: { id: dto.produtoId },
      });
      if (!produto || !produto.ativo) {
        throw new BadRequestException('Produto de crédito inválido ou inativo');
      }
      const valor = dec(dto.valorPrincipal);
      if (valor.lt(dec(produto.valorMin)) || valor.gt(dec(produto.valorMax))) {
        throw new BadRequestException(
          `Valor fora da faixa do produto (${produto.valorMin}–${produto.valorMax})`,
        );
      }
      if (
        dto.prazoMeses < produto.prazoMinMeses ||
        dto.prazoMeses > produto.prazoMaxMeses
      ) {
        throw new BadRequestException('Prazo fora da faixa do produto');
      }
    }

    const dataContratacao = dto.dataContratacao
      ? toUtcDate(dto.dataContratacao)
      : toUtcDate(new Date());

    const calc = calcularEmprestimo({
      valorPrincipal: dto.valorPrincipal,
      taxaJurosMesPercent: dto.taxaJurosMes,
      tipoAmortizacao: dto.tipoAmortizacao,
      prazoMeses: dto.prazoMeses,
      diaVencimento: dto.diaVencimento,
      dataContratacao,
      tarifasIniciais: dto.tarifasIniciais,
    });
    const dataFinal = calc.cronograma[calc.cronograma.length - 1].vencimento;

    const emprestimo = await this.prisma.$transaction(async (tx) => {
      const numeroContrato = await this.gerarNumeroContrato(tx, dataContratacao);

      const emp = await tx.emprestimo.create({
        data: {
          clienteId: dto.clienteId,
          produtoId: dto.produtoId ?? null,
          numeroContrato,
          valorPrincipal: money(dto.valorPrincipal),
          taxaJurosMes: percentToRate(dec(dto.taxaJurosMes)),
          multaAtrasoPercent: multaFrac,
          jurosMoraMesPercent: moraFrac,
          tipoAmortizacao: dto.tipoAmortizacao,
          prazoMeses: dto.prazoMeses,
          diaVencimento: dto.diaVencimento,
          cetMes: calc.cetMes,
          cetAno: calc.cetAno,
          totalJuros: calc.totalJuros,
          totalAPagar: calc.totalAPagar,
          dataContratacao,
          dataFinal,
          status: EmprestimoStatus.AGUARDANDO_APROVACAO,
          parcelas: {
            create: calc.cronograma.map((p) => ({
              numero: p.numero,
              tipo: p.tipo,
              vencimento: p.vencimento,
              valorPrincipal: p.valorPrincipal,
              valorJuros: p.valorJuros,
              valorParcela: p.valorParcela,
              saldoDevedorApos: p.saldoDevedorApos,
            })),
          },
        },
      });

      await this.audit.log(
        {
          actorId,
          acao: 'EMPRESTIMO_CRIADO',
          entidade: 'Emprestimo',
          entidadeId: emp.id,
          depois: { numeroContrato, valorPrincipal: dto.valorPrincipal },
        },
        tx,
      );
      return emp;
    });

    return this.buscar(emprestimo.id);
  }

  // -------------------------------------------------------------------------
  // Liberação (desembolso) -> ATIVO
  // -------------------------------------------------------------------------
  async liberar(id: string, actorId: string) {
    const emp = await this.prisma.emprestimo.findUnique({ where: { id } });
    if (!emp) throw new NotFoundException('Empréstimo não encontrado');
    if (emp.status !== EmprestimoStatus.AGUARDANDO_APROVACAO) {
      throw new BadRequestException(
        `Só é possível liberar empréstimos aguardando aprovação (status atual: ${emp.status})`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.emprestimo.update({
        where: { id },
        data: {
          status: EmprestimoStatus.ATIVO,
          aprovadoPor: actorId,
          aprovadoEm: new Date(),
          dataLiberacao: new Date(),
        },
      });
      // O razão representa o SALDO DEVEDOR TOTAL em aberto (principal + juros
      // contratados + encargos - pagamentos). Na liberação registramos o
      // principal desembolsado e a apropriação total dos juros do contrato,
      // de modo que o saldo zere exatamente quando todas as parcelas forem pagas.
      await this.ledger.post(tx, {
        emprestimoId: id,
        tipo: LedgerTipo.DESEMBOLSO,
        direcao: LedgerDirecao.DEBITO,
        valor: emp.valorPrincipal,
        competencia: toUtcDate(new Date()),
        descricao: 'Desembolso do principal',
        idempotencyKey: `desembolso:${id}`,
        criadoPor: actorId,
      });
      if (emp.totalJuros && dec(emp.totalJuros).gt(0)) {
        await this.ledger.post(tx, {
          emprestimoId: id,
          tipo: LedgerTipo.JUROS_CONTRATUAL,
          direcao: LedgerDirecao.DEBITO,
          valor: emp.totalJuros,
          competencia: toUtcDate(new Date()),
          descricao: 'Apropriação de juros do contrato',
          idempotencyKey: `juros_contratual:${id}`,
          criadoPor: actorId,
        });
      }
      await this.audit.log(
        {
          actorId,
          acao: 'EMPRESTIMO_LIBERADO',
          entidade: 'Emprestimo',
          entidadeId: id,
        },
        tx,
      );
      await this.notificacoes.criar(
        {
          clienteId: emp.clienteId,
          tipo: 'EMPRESTIMO_CRIADO',
          titulo: 'Crédito liberado',
          mensagem: `Seu empréstimo ${emp.numeroContrato} foi liberado.`,
          idempotencyKey: `emprestimo_liberado:${id}`,
        },
        tx,
      );
    });

    return this.buscar(id);
  }

  async cancelar(id: string, motivo: string, actorId: string) {
    const emp = await this.prisma.emprestimo.findUnique({ where: { id } });
    if (!emp) throw new NotFoundException('Empréstimo não encontrado');
    if ([EmprestimoStatus.LIQUIDADO, EmprestimoStatus.CANCELADO].includes(emp.status)) {
      throw new BadRequestException('Empréstimo já encerrado');
    }
    await this.prisma.emprestimo.update({
      where: { id },
      data: {
        status: EmprestimoStatus.CANCELADO,
        canceladoPor: actorId,
        canceladoEm: new Date(),
        motivoCancelamento: motivo,
      },
    });
    await this.audit.log({
      actorId,
      acao: 'EMPRESTIMO_CANCELADO',
      entidade: 'Emprestimo',
      entidadeId: id,
      depois: { motivo },
    });
    return this.buscar(id);
  }

  // -------------------------------------------------------------------------
  // Consultas
  // -------------------------------------------------------------------------
  async listar(params: {
    status?: EmprestimoStatus;
    clienteId?: string;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.EmprestimoWhereInput = {
      status: params.status,
      clienteId: params.clienteId,
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.emprestimo.count({ where }),
      this.prisma.emprestimo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { cliente: { select: { id: true, nome: true, cpf: true } } },
      }),
    ]);
    return {
      data,
      meta: {
        total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: Math.ceil(total / params.pageSize),
      },
    };
  }

  async buscar(id: string) {
    const emp = await this.prisma.emprestimo.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nome: true, cpf: true, telefone: true } },
        parcelas: { orderBy: { numero: 'asc' } },
      },
    });
    if (!emp) throw new NotFoundException('Empréstimo não encontrado');
    const resumo = await this.montarResumo(id, emp.dataFinal, emp.parcelas);
    return { ...emp, resumo };
  }

  async meusEmprestimos(clienteId: string) {
    const emprestimos = await this.prisma.emprestimo.findMany({
      where: { clienteId },
      orderBy: { createdAt: 'desc' },
      include: { parcelas: { orderBy: { numero: 'asc' } } },
    });
    return Promise.all(
      emprestimos.map(async (e) => ({
        ...e,
        resumo: await this.montarResumo(e.id, e.dataFinal, e.parcelas),
      })),
    );
  }

  async buscarDoCliente(id: string, clienteId: string) {
    const emp = await this.buscar(id);
    if (emp.clienteId !== clienteId) {
      throw new ForbiddenException('Empréstimo não pertence ao cliente');
    }
    return emp;
  }

  // -------------------------------------------------------------------------
  // Resumo (tela do cliente)
  // -------------------------------------------------------------------------
  private async montarResumo(
    emprestimoId: string,
    dataFinal: Date,
    parcelas: {
      vencimento: Date;
      valorParcela: Decimal | any;
      valorPago: Decimal | any;
      multa: Decimal | any;
      jurosMora: Decimal | any;
      diasAtraso: number;
      status: string;
    }[],
  ) {
    const saldoDevedor = await this.ledger.getSaldo(emprestimoId);
    const hoje = toUtcDate(new Date());

    const emAberto = parcelas.filter(
      (p) => p.status === 'PENDENTE' || p.status === 'PARCIAL' || p.status === 'VENCIDA',
    );

    const proxima = emAberto
      .slice()
      .sort((a, b) => toUtcDate(a.vencimento).getTime() - toUtcDate(b.vencimento).getTime())[0];

    const vencidas = emAberto.filter((p) => toUtcDate(p.vencimento) < hoje);

    const valorDevidoVencido = sumMoney(
      vencidas.map((p) =>
        nonNegative(
          dec(p.valorParcela)
            .plus(dec(p.multa))
            .plus(dec(p.jurosMora))
            .minus(dec(p.valorPago)),
        ),
      ),
    );

    const encargosAcumulados = sumMoney(
      parcelas.map((p) => dec(p.multa).plus(dec(p.jurosMora))),
    );

    const diasAtraso = parcelas.reduce((max, p) => Math.max(max, p.diasAtraso), 0);
    const prazoRestanteDias = Math.max(0, diffDays(dataFinal, hoje));

    return {
      saldoDevedor: money(saldoDevedor),
      proximoVencimento: proxima ? proxima.vencimento : null,
      valorProximaParcela: proxima
        ? money(
            dec(proxima.valorParcela)
              .plus(dec(proxima.multa))
              .plus(dec(proxima.jurosMora))
              .minus(dec(proxima.valorPago)),
          )
        : money(0),
      valorVencidoEmAberto: valorDevidoVencido,
      diasAtraso,
      encargosAcumulados,
      prazoRestanteDias,
      parcelasVencidas: vencidas.length,
    };
  }

  // -------------------------------------------------------------------------
  private async gerarNumeroContrato(
    tx: Prisma.TransactionClient,
    data: Date,
  ): Promise<string> {
    const ano = toUtcDate(data).getUTCFullYear();
    const count = await tx.emprestimo.count({
      where: { numeroContrato: { startsWith: `CM-${ano}-` } },
    });
    const seq = String(count + 1).padStart(6, '0');
    return `CM-${ano}-${seq}`;
  }
}
