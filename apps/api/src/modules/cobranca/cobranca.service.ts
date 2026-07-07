import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import {
  EmprestimoStatus,
  JobStatus,
  LedgerDirecao,
  LedgerTipo,
  ParcelaStatus,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { AuditService } from '../audit/audit.service';
import { FinanceSummaryService } from '../../common/finance/finance-summary.service';
import { calcularEncargos } from '../../domain/finance/mora';
import { dec, money, nonNegative, sumMoney, Decimal } from '../../domain/finance/money';
import { addDays, isoDate, toUtcDate } from '../../domain/finance/dates';

const JOB_NOME = 'cobranca-diaria';
const DIAS_AVISO_PREVIO = 3;

export interface ResultadoCobranca {
  referencia: string;
  pulado?: boolean;
  parcelasProcessadas: number;
  parcelasVencidas: number;
  totalMulta: string;
  totalMora: string;
  avisosVencimento: number;
}

@Injectable()
export class CobrancaService implements OnModuleInit {
  private readonly logger = new Logger(CobrancaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly notificacoes: NotificacoesService,
    private readonly audit: AuditService,
    private readonly finance: FinanceSummaryService,
    private readonly config: ConfigService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  /**
   * Registra o cron dinamicamente lendo a expressão/fuso do ConfigService.
   * (Não usamos o decorator @Cron porque ele é avaliado antes do .env carregar.)
   */
  onModuleInit() {
    // No Vercel o cron roda via Vercel Cron → GET /api/v1/cron/cobranca
    if (process.env.VERCEL || process.env.DISABLE_IN_PROCESS_CRON === 'true') {
      this.logger.log('Cron interno desabilitado (usa Vercel Cron)');
      return;
    }

    const cronTime = this.config.get<string>('cobranca.cron', '5 0 * * *');
    const timeZone = this.config.get<string>('timezone', 'America/Sao_Paulo');

    const job = new CronJob(
      cronTime,
      () => {
        this.rotinaAgendada().catch((e) =>
          this.logger.error(`Erro na rotina agendada: ${e?.message ?? e}`),
        );
      },
      null,
      false,
      timeZone,
    );

    this.scheduler.addCronJob(JOB_NOME, job as never);
    job.start();
    this.logger.log(`Cron de cobrança agendado: "${cronTime}" (${timeZone})`);
  }

  async rotinaAgendada() {
    this.logger.log('Iniciando rotina diária de cobrança');
    await this.executar();
  }

  listarAtrasados() {
    return this.finance.listarContratosAtrasados();
  }

  /**
   * Executa a rotina de cobrança para a data de referência (padrão: hoje).
   * Idempotente: protegido por JobExecution + idempotencyKeys no razão e nas
   * notificações. Rodar 2x no mesmo dia não duplica encargos nem avisos.
   */
  async executar(
    referencia: Date = new Date(),
    manual = false,
    actorId?: string,
  ): Promise<ResultadoCobranca> {
    const ref = toUtcDate(referencia);
    const chave = isoDate(ref);

    const existing = await this.prisma.jobExecution.findUnique({
      where: { nome_chave: { nome: JOB_NOME, chave } },
    });
    if (existing?.status === JobStatus.CONCLUIDO && !manual) {
      return {
        referencia: chave,
        pulado: true,
        parcelasProcessadas: 0,
        parcelasVencidas: 0,
        totalMulta: '0.00',
        totalMora: '0.00',
        avisosVencimento: 0,
      };
    }

    const job = existing
      ? await this.prisma.jobExecution.update({
          where: { id: existing.id },
          data: { status: JobStatus.EXECUTANDO, iniciadoEm: new Date(), erro: null },
        })
      : await this.prisma.jobExecution.create({
          data: { nome: JOB_NOME, chave, status: JobStatus.EXECUTANDO },
        });

    let parcelasProcessadas = 0;
    let parcelasVencidas = 0;
    let avisosVencimento = 0;
    const multas: string[] = [];
    const moras: string[] = [];

    try {
      // 1) Avisos de vencimento (hoje e próximos)
      avisosVencimento += await this.enviarAvisosVencimento(ref);

      // 2) Cálculo de encargos das parcelas vencidas
      const vencidas = await this.prisma.parcela.findMany({
        where: {
          status: {
            in: [ParcelaStatus.PENDENTE, ParcelaStatus.PARCIAL, ParcelaStatus.VENCIDA],
          },
          vencimento: { lt: ref },
          emprestimo: {
            status: { in: [EmprestimoStatus.ATIVO, EmprestimoStatus.EM_ATRASO] },
          },
        },
        include: { emprestimo: true },
      });

      for (const parcela of vencidas) {
        parcelasProcessadas++;
        const base = nonNegative(
          dec(parcela.valorParcela).minus(dec(parcela.valorPago)),
        );
        if (base.isZero()) continue;

        const alvo = calcularEncargos({
          valorEmAberto: base,
          vencimento: parcela.vencimento,
          referencia: ref,
          multaPercent: parcela.emprestimo.multaAtrasoPercent,
          jurosMoraMesPercent: parcela.emprestimo.jurosMoraMesPercent,
          multaDiariaFixa: parcela.emprestimo.multaDiariaFixa,
        });

        // Encargos são NÃO-DECRESCENTES: como só lançamos deltas positivos no
        // razão, o valor armazenado na parcela nunca pode regredir (caso
        // contrário parcela e razão divergiriam). Mantemos o máximo acumulado.
        const multaFinal = Decimal.max(dec(parcela.multa), alvo.multa);
        const moraFinal = Decimal.max(dec(parcela.jurosMora), alvo.jurosMora);
        const deltaMulta = money(multaFinal.minus(dec(parcela.multa)));
        const deltaMora = money(moraFinal.minus(dec(parcela.jurosMora)));

        await this.prisma.$transaction(async (tx) => {
          await tx.parcela.update({
            where: { id: parcela.id },
            data: {
              multa: multaFinal,
              jurosMora: moraFinal,
              diasAtraso: alvo.diasAtraso,
              status: ParcelaStatus.VENCIDA,
              moraCalculadaAte: ref,
            },
          });

          if (deltaMulta.gt(0)) {
            await this.ledger.post(tx, {
              emprestimoId: parcela.emprestimoId,
              parcelaId: parcela.id,
              tipo: LedgerTipo.MULTA,
              direcao: LedgerDirecao.DEBITO,
              valor: deltaMulta,
              competencia: ref,
              descricao: `Multa por atraso - parcela ${parcela.numero}`,
              idempotencyKey: `multa:${parcela.id}:${chave}`,
              criadoPor: actorId,
            });
          }
          if (deltaMora.gt(0)) {
            await this.ledger.post(tx, {
              emprestimoId: parcela.emprestimoId,
              parcelaId: parcela.id,
              tipo: LedgerTipo.JUROS_MORA,
              direcao: LedgerDirecao.DEBITO,
              valor: deltaMora,
              competencia: ref,
              descricao: `Juros de mora (${alvo.diasAtraso}d) - parcela ${parcela.numero}`,
              idempotencyKey: `mora:${parcela.id}:${chave}`,
              criadoPor: actorId,
            });
          }

          if (parcela.emprestimo.status === EmprestimoStatus.ATIVO) {
            await tx.emprestimo.update({
              where: { id: parcela.emprestimoId },
              data: { status: EmprestimoStatus.EM_ATRASO },
            });
          }

          await this.notificacoes.criar(
            {
              clienteId: parcela.emprestimo.clienteId,
              tipo: 'ATRASO',
              titulo: 'Parcela em atraso',
              mensagem: `A parcela ${parcela.numero} está ${alvo.diasAtraso} dia(s) em atraso. Encargos acumulados: R$ ${money(
                alvo.multa.plus(alvo.jurosMora),
              )}.`,
              idempotencyKey: `atraso:${parcela.id}:${chave}`,
            },
            tx,
          );
        });

        parcelasVencidas++;
        multas.push(deltaMulta.gt(0) ? deltaMulta.toString() : '0');
        moras.push(deltaMora.gt(0) ? deltaMora.toString() : '0');
      }

      const stats = {
        parcelasProcessadas,
        parcelasVencidas,
        avisosVencimento,
        totalMulta: sumMoney(multas).toFixed(2),
        totalMora: sumMoney(moras).toFixed(2),
      };

      await this.prisma.jobExecution.update({
        where: { id: job.id },
        data: { status: JobStatus.CONCLUIDO, finalizadoEm: new Date(), stats },
      });
      await this.audit.log({
        actorId: actorId ?? null,
        acao: 'COBRANCA_DIARIA_EXECUTADA',
        entidade: 'JobExecution',
        entidadeId: job.id,
        depois: stats,
      });

      this.logger.log(
        `Cobrança ${chave} concluída: ${parcelasVencidas} parcela(s) vencida(s)`,
      );

      return { referencia: chave, ...stats };
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : String(err);
      await this.prisma.jobExecution.update({
        where: { id: job.id },
        data: { status: JobStatus.FALHA, finalizadoEm: new Date(), erro: mensagem },
      });
      this.logger.error(`Falha na cobrança ${chave}: ${mensagem}`);
      throw err;
    }
  }

  private async enviarAvisosVencimento(ref: Date): Promise<number> {
    const chave = isoDate(ref);
    const limiteProximo = addDays(ref, DIAS_AVISO_PREVIO);

    const parcelas = await this.prisma.parcela.findMany({
      where: {
        status: { in: [ParcelaStatus.PENDENTE, ParcelaStatus.PARCIAL] },
        vencimento: { gte: ref, lte: limiteProximo },
        emprestimo: {
          status: { in: [EmprestimoStatus.ATIVO, EmprestimoStatus.EM_ATRASO] },
        },
      },
      include: { emprestimo: true },
    });

    let enviados = 0;
    for (const p of parcelas) {
      const venceHoje = isoDate(p.vencimento) === chave;
      const tipo = venceHoje ? 'VENCIMENTO_HOJE' : 'VENCIMENTO_PROXIMO';
      const prefixo = venceHoje ? 'venc_hoje' : 'venc_proximo';
      const valor = money(dec(p.valorParcela).minus(dec(p.valorPago)));
      await this.notificacoes.criar({
        clienteId: p.emprestimo.clienteId,
        tipo,
        titulo: venceHoje ? 'Vencimento hoje' : 'Vencimento próximo',
        mensagem: venceHoje
          ? `A parcela ${p.numero} vence hoje. Valor: R$ ${valor}.`
          : `A parcela ${p.numero} vence em ${isoDate(p.vencimento)}. Valor: R$ ${valor}.`,
        idempotencyKey: `${prefixo}:${p.id}:${chave}`,
      });
      enviados++;
    }
    return enviados;
  }
}
