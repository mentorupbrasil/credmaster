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
  ParcelaStatus,
  PagamentoForma,
  PagamentoStatus,
  ParcelaTipo,
  Prisma,
  TipoAmortizacao,
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
import { calcularEmprestimoSimples } from '../../domain/finance/simple-loan';
import {
  CreateEmprestimoDto,
  CreateEmprestimoSimplesDto,
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
  // Simulação (não persiste) — pública
  // -------------------------------------------------------------------------
  async simular(dto: SimularEmprestimoDto) {
    const dataContratacao = dto.dataContratacao
      ? toUtcDate(dto.dataContratacao)
      : toUtcDate(new Date());

    const limites = await this.parametros.getLimitesRegulatorios();
    this.validarCondicoesGerais(dto, limites);

    const r = calcularEmprestimo({
      valorPrincipal: dto.valorPrincipal,
      taxaJurosMesPercent: dto.taxaJurosMes,
      tipoAmortizacao: dto.tipoAmortizacao,
      prazoMeses: dto.prazoMeses,
      diaVencimento: dto.diaVencimento,
      dataContratacao,
      tarifasIniciais: dto.tarifasIniciais,
      iofDiario: limites.iofDiario,
      iofAdicional: limites.iofAdicional,
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
      iof: r.iof,
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

  /** Validações de usura e limites globais de valor/prazo. */
  private validarCondicoesGerais(
    dto: { valorPrincipal: Decimal.Value; taxaJurosMes: Decimal.Value; prazoMeses: number },
    limites: Awaited<ReturnType<ParametrosService['getLimitesRegulatorios']>>,
  ) {
    const taxaFrac = percentToRate(dec(dto.taxaJurosMes));
    if (taxaFrac.gt(limites.taxaJurosMaxMes)) {
      throw new BadRequestException(
        `Taxa de juros acima do teto permitido (${limites.taxaJurosMaxMes.mul(100)}% a.m.)`,
      );
    }
    if (taxaFrac.lt(0)) {
      throw new BadRequestException('Taxa de juros não pode ser negativa');
    }
    const valor = dec(dto.valorPrincipal);
    if (valor.lt(limites.valorMinGlobal) || valor.gt(limites.valorMaxGlobal)) {
      throw new BadRequestException(
        `Valor fora dos limites globais (${limites.valorMinGlobal}–${limites.valorMaxGlobal})`,
      );
    }
    if (
      dto.prazoMeses < limites.prazoMinGlobal ||
      dto.prazoMeses > limites.prazoMaxGlobal
    ) {
      throw new BadRequestException(
        `Prazo fora dos limites globais (${limites.prazoMinGlobal}–${limites.prazoMaxGlobal} meses)`,
      );
    }
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
    this.validarCondicoesGerais(dto, limites);
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
      iofDiario: limites.iofDiario,
      iofAdicional: limites.iofAdicional,
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
          iof: calc.iof,
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

  /** Empréstimo simples: principal + juros % + vencimento único. Já libera como ATIVO. */
  async criarSimples(dto: CreateEmprestimoSimplesDto, actorId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    if (
      !([ClienteStatus.APROVADO, ClienteStatus.ATIVO] as ClienteStatus[]).includes(
        cliente.status,
      )
    ) {
      throw new BadRequestException('Cliente precisa estar ativo para receber empréstimo');
    }

    const multaDiaria =
      dto.multaDiariaFixa ??
      parseFloat((await this.parametros.get('app.valor_atraso_diario')) ?? '10');

    const dataEmprestimo = toUtcDate(dto.dataEmprestimo);
    const dataVencimento = toUtcDate(dto.dataVencimento);
    if (dataVencimento <= dataEmprestimo) {
      throw new BadRequestException('Data de vencimento deve ser após a data do empréstimo');
    }

    const calc = calcularEmprestimoSimples({
      valorEmprestado: dto.valorEmprestado,
      taxaJurosPercent: dto.taxaJurosPercent,
      dataEmprestimo,
      dataVencimento,
      multaDiariaFixa: multaDiaria,
    });

    const emprestimo = await this.prisma.$transaction(async (tx) => {
      const numeroContrato = await this.gerarNumeroContrato(tx, dataEmprestimo);
      const emp = await tx.emprestimo.create({
        data: {
          clienteId: dto.clienteId,
          numeroContrato,
          valorPrincipal: calc.valorEmprestado,
          taxaJurosMes: percentToRate(dec(dto.taxaJurosPercent)),
          taxaJurosPercent: dec(dto.taxaJurosPercent),
          multaAtrasoPercent: dec(0),
          jurosMoraMesPercent: dec(0),
          multaDiariaFixa: calc.multaDiariaFixa,
          tipoAmortizacao: TipoAmortizacao.BULLET,
          prazoMeses: 1,
          prazoDias: calc.prazoDias,
          diaVencimento: dataVencimento.getUTCDate(),
          totalJuros: calc.valorJuros,
          totalAPagar: calc.valorTotalOriginal,
          saldoDevedor: calc.valorTotalOriginal,
          saldoPrincipal: calc.valorEmprestado,
          dataContratacao: dataEmprestimo,
          dataLiberacao: dataEmprestimo,
          dataFinal: dataVencimento,
          observacoes: dto.observacoes,
          status: EmprestimoStatus.ATIVO,
          aprovadoPor: actorId,
          aprovadoEm: new Date(),
          parcelas: {
            create: [
              {
                numero: 1,
                tipo: ParcelaTipo.PRINCIPAL,
                vencimento: dataVencimento,
                valorPrincipal: calc.valorEmprestado,
                valorJuros: calc.valorJuros,
                valorParcela: calc.valorTotalOriginal,
                saldoDevedorApos: money(0),
              },
            ],
          },
        },
      });

      await this.ledger.post(tx, {
        emprestimoId: emp.id,
        tipo: LedgerTipo.DESEMBOLSO,
        direcao: LedgerDirecao.DEBITO,
        valor: calc.valorEmprestado,
        competencia: dataEmprestimo,
        descricao: 'Desembolso do principal',
        idempotencyKey: `desembolso:${emp.id}`,
        criadoPor: actorId,
      });
      await this.ledger.post(tx, {
        emprestimoId: emp.id,
        tipo: LedgerTipo.JUROS_CONTRATUAL,
        direcao: LedgerDirecao.DEBITO,
        valor: calc.valorJuros,
        competencia: dataEmprestimo,
        descricao: 'Juros do contrato',
        idempotencyKey: `juros_contratual:${emp.id}`,
        criadoPor: actorId,
      });
      await this.audit.log(
        {
          actorId,
          acao: 'EMPRESTIMO_SIMPLES_CRIADO',
          entidade: 'Emprestimo',
          entidadeId: emp.id,
          depois: { numeroContrato, valor: dto.valorEmprestado },
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
          // Inicializa o saldo de principal em aberto com o valor desembolsado.
          saldoPrincipal: money(emp.valorPrincipal),
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
    if (
      ([EmprestimoStatus.LIQUIDADO, EmprestimoStatus.CANCELADO] as EmprestimoStatus[]).includes(
        emp.status,
      )
    ) {
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
  // Quitação antecipada (com abatimento de juros futuros)
  // -------------------------------------------------------------------------

  /**
   * Calcula o valor de quitação antecipada na data de referência:
   *  - principal em aberto (parcelas não pagas)
   *  - juros remuneratórios PRO-RATA do período corrente (não os juros futuros)
   *  - encargos de mora já incorridos (multa + juros de mora em aberto)
   * O abatimento corresponde aos juros contratuais futuros ainda não incorridos.
   */
  async previewQuitacao(id: string, dataRef?: Date) {
    const emp = await this.prisma.emprestimo.findUnique({
      where: { id },
      include: { parcelas: { orderBy: { vencimento: 'asc' } } },
    });
    if (!emp) throw new NotFoundException('Empréstimo não encontrado');
    if (
      emp.status !== EmprestimoStatus.ATIVO &&
      emp.status !== EmprestimoStatus.EM_ATRASO &&
      emp.status !== EmprestimoStatus.INADIMPLENTE
    ) {
      throw new BadRequestException(
        `Quitação disponível apenas para contratos em curso (status: ${emp.status})`,
      );
    }

    const hoje = toUtcDate(dataRef ?? new Date());

    const emAberto = emp.parcelas.filter(
      (p) => p.status !== ParcelaStatus.PAGA && p.status !== ParcelaStatus.CANCELADA,
    );

    const principalEmAberto = sumMoney(
      emAberto.map((p) => nonNegative(dec(p.valorPrincipal))),
    );

    // Encargos de mora já incorridos (multa + juros de mora calculados no job).
    const encargosMora = sumMoney(
      emAberto.map((p) =>
        nonNegative(
          dec(p.multa).plus(dec(p.jurosMora)).minus(
            // parte do valorPago que já cobriu encargos é desconsiderada aqui
            dec(0),
          ),
        ),
      ),
    );

    // Início do período corrente: último vencimento anterior a hoje, senão
    // a data de liberação/contratação.
    const baseInicio = emp.dataLiberacao ?? emp.dataContratacao;
    const ultimoVencPassado = emp.parcelas
      .map((p) => toUtcDate(p.vencimento))
      .filter((v) => v < hoje)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const periodoInicio = ultimoVencPassado ?? toUtcDate(baseInicio);
    const diasPeriodo = Math.min(31, Math.max(0, diffDays(hoje, periodoInicio)));

    const taxaMes = dec(emp.taxaJurosMes); // fração
    const jurosCorridos = money(
      principalEmAberto.mul(taxaMes).mul(diasPeriodo).div(30),
    );

    // Créditos já pagos em parcelas parciais reduzem o saldo.
    const jaPago = sumMoney(emAberto.map((p) => dec(p.valorPago)));

    const valorQuitacao = nonNegative(
      principalEmAberto.plus(jurosCorridos).plus(encargosMora).minus(jaPago),
    );

    const saldoContabil = await this.ledger.getSaldo(id);
    const abatimentoJurosFuturos = nonNegative(saldoContabil.minus(valorQuitacao));

    return {
      dataReferencia: hoje,
      principalEmAberto: money(principalEmAberto),
      jurosCorridos,
      encargosMora: money(encargosMora),
      creditosAbatidos: money(jaPago),
      valorQuitacao: money(valorQuitacao),
      saldoContabilAtual: money(saldoContabil),
      abatimentoJurosFuturos: money(abatimentoJurosFuturos),
      diasPeriodo,
    };
  }

  async quitar(
    id: string,
    opts: { forma?: PagamentoForma; observacao?: string; dataRef?: Date },
    actorId: string,
  ) {
    const preview = await this.previewQuitacao(id, opts.dataRef);
    const hoje = toUtcDate(opts.dataRef ?? new Date());

    await this.prisma.$transaction(async (tx) => {
      const emp = await tx.emprestimo.findUnique({
        where: { id },
        include: { parcelas: true },
      });
      if (!emp) throw new NotFoundException('Empréstimo não encontrado');

      // 1) Abate os juros contratuais futuros ainda não incorridos (crédito).
      if (dec(preview.abatimentoJurosFuturos).gt(0)) {
        await this.ledger.post(tx, {
          emprestimoId: id,
          tipo: LedgerTipo.AJUSTE,
          direcao: LedgerDirecao.CREDITO,
          valor: preview.abatimentoJurosFuturos,
          competencia: hoje,
          descricao: 'Abatimento de juros futuros por quitação antecipada',
          idempotencyKey: `quitacao_abatimento:${id}`,
          criadoPor: actorId,
        });
      }

      // 2) Registra o pagamento de quitação (crédito) e zera o saldo.
      const pagamento = await tx.pagamento.create({
        data: {
          emprestimoId: id,
          valor: dec(preview.valorQuitacao),
          forma: opts.forma ?? PagamentoForma.PIX,
          status: PagamentoStatus.CONFIRMADO,
          dataPagamento: hoje,
          observacao: opts.observacao ?? 'Quitação antecipada',
          registradoPor: actorId,
        },
      });

      await this.ledger.post(tx, {
        emprestimoId: id,
        tipo: LedgerTipo.PAGAMENTO,
        direcao: LedgerDirecao.CREDITO,
        valor: dec(preview.valorQuitacao),
        competencia: hoje,
        descricao: `Quitação antecipada (pagamento ${pagamento.id})`,
        idempotencyKey: `quitacao_pagamento:${id}`,
        criadoPor: actorId,
      });

      // 3) Baixa todas as parcelas em aberto.
      await tx.parcela.updateMany({
        where: {
          emprestimoId: id,
          status: { notIn: [ParcelaStatus.PAGA, ParcelaStatus.CANCELADA] },
        },
        data: { status: ParcelaStatus.PAGA, dataPagamento: hoje },
      });

      await tx.emprestimo.update({
        where: { id },
        data: {
          status: EmprestimoStatus.LIQUIDADO,
          dataLiquidacao: hoje,
          saldoPrincipal: dec(0),
        },
      });

      await this.ledger.recalcularSaldoPrincipal(tx, id);

      await this.audit.log(
        {
          actorId,
          acao: 'EMPRESTIMO_QUITADO_ANTECIPADAMENTE',
          entidade: 'Emprestimo',
          entidadeId: id,
          depois: {
            valorQuitacao: preview.valorQuitacao,
            abatimentoJurosFuturos: preview.abatimentoJurosFuturos,
          },
        },
        tx,
      );

      await this.notificacoes.criar(
        {
          clienteId: emp.clienteId,
          tipo: 'EMPRESTIMO_LIQUIDADO',
          titulo: 'Empréstimo quitado',
          mensagem: `Seu empréstimo ${emp.numeroContrato} foi quitado. Obrigado!`,
          idempotencyKey: `emprestimo_quitado:${id}`,
        },
        tx,
      );
    });

    return { ...(await this.buscar(id)), quitacao: preview };
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
    const resumo = this.montarResumo(emp.saldoDevedor, emp.dataFinal, emp.parcelas);
    return { ...emp, resumo };
  }

  async meusEmprestimos(clienteId: string) {
    const emprestimos = await this.prisma.emprestimo.findMany({
      where: { clienteId },
      orderBy: { createdAt: 'desc' },
      include: { parcelas: { orderBy: { numero: 'asc' } } },
    });
    return emprestimos.map((e) => ({
      ...e,
      resumo: this.montarResumo(e.saldoDevedor, e.dataFinal, e.parcelas),
    }));
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
  private montarResumo(
    saldoDevedorCache: Decimal | any,
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
    const saldoDevedor = dec(saldoDevedorCache);
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
