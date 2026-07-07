'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Wallet,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  CircleDollarSign,
} from 'lucide-react';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import {
  HeroMetric,
  KpiSection,
  MetricCard,
  PageHeader,
  PageSkeleton,
  ErrorBox,
  SectionCard,
  DataTable,
  StatusBadge,
  EmptyState,
  DonutChart,
  ChartLegend,
  FinanceBarChart,
} from '@/components/ui';

interface DashboardData {
  data: string;
  clientesAtivos: number;
  clientesPendentes: number;
  emprestimosAtivos: number;
  emAtraso: number;
  liquidados: number;
  vencendoHoje: number;
  vencendoProximos7Dias: number;
  valorTotalEmprestado: string;
  valorTotalReceber: string;
  valorRecebidoNoMes: string;
  valorRecebidoHoje: string;
  carteiraEmAtraso: string;
  lucroPrevisto: string;
  lucroRecebido: string;
  saldoEmAberto: string;
  graficoStatus: { ativos: number; emAtraso: number; liquidados: number; vencendoHoje: number };
  graficoRecebimento: { previsto: string; recebidoMes: string };
  vencendoHojeLista: Array<{
    emprestimoId: string;
    numeroContrato: string;
    clienteNome: string;
    saldoRestante: string;
    dataVencimento: string;
  }>;
  atrasadosLista: Array<{
    emprestimoId: string;
    numeroContrato: string;
    clienteNome: string;
    saldoRestante: string;
    diasAtraso: number;
  }>;
  ultimosPagamentos: Array<{
    id: string;
    valor: string;
    dataPagamento: string;
    forma: string;
    clienteNome: string;
    numeroContrato: string;
  }>;
  ultimosEmprestimos: Array<{
    id: string;
    numeroContrato: string;
    valorPrincipal: string;
    status: string;
    clienteNome: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = () => {
    setErro(null);
    api
      .get<DashboardData>('/dashboard')
      .then(setData)
      .catch((e) => setErro(e.message));
  };

  useEffect(() => {
    carregar();
  }, []);

  if (erro) return <ErrorBox message={erro} onRetry={carregar} />;
  if (!data) return <PageSkeleton />;

  const statusChart = [
    { name: 'Ativos', value: data.graficoStatus.ativos, color: '#6366F1' },
    { name: 'Em atraso', value: data.graficoStatus.emAtraso, color: '#E11D48' },
    { name: 'Liquidados', value: data.graficoStatus.liquidados, color: '#059669' },
    { name: 'Vencendo hoje', value: data.graficoStatus.vencendoHoje, color: '#D97706' },
  ];

  const recebChart = [
    { name: 'Previsto', value: Number(data.graficoRecebimento.previsto) },
    { name: 'Recebido', value: Number(data.graficoRecebimento.recebidoMes) },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard executivo"
        subtitle={`Visão consolidada da carteira · referência ${dataBR(data.data)}`}
      />

      {/* Hero KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <HeroMetric
          label="Valor total a receber"
          value={brl(data.valorTotalReceber)}
          hint="Saldo devedor da carteira ativa"
          icon={CircleDollarSign}
          accent="blue"
        />
        <HeroMetric
          label="Recebido no mês"
          value={brl(data.valorRecebidoNoMes)}
          hint={`Hoje: ${brl(data.valorRecebidoHoje)}`}
          icon={Banknote}
          accent="green"
        />
        <HeroMetric
          label="Carteira em atraso"
          value={brl(data.carteiraEmAtraso)}
          hint={`${data.emAtraso} contrato(s) inadimplente(s)`}
          icon={AlertTriangle}
          accent="red"
        />
        <HeroMetric
          label="Vencendo hoje"
          value={data.vencendoHoje}
          hint={`${data.vencendoProximos7Dias} nos próximos 7 dias`}
          icon={CalendarClock}
          accent="amber"
        />
      </div>

      <KpiSection title="Carteira & clientes" description="Posição geral da base">
        <MetricCard label="Clientes ativos" value={data.clientesAtivos} accent="blue" icon={Users} />
        <MetricCard label="Contratos ativos" value={data.emprestimosAtivos} icon={Wallet} />
        <MetricCard label="Total emprestado" value={brl(data.valorTotalEmprestado)} />
        <MetricCard label="Saldo em aberto" value={brl(data.saldoEmAberto)} />
        <MetricCard label="Liquidados" value={data.liquidados} accent="green" />
        <MetricCard label="Clientes pendentes" value={data.clientesPendentes} accent="amber" />
        <MetricCard label="Lucro previsto (juros)" value={brl(data.lucroPrevisto)} accent="blue" />
        <MetricCard label="Lucro recebido (mês)" value={brl(data.lucroRecebido)} accent="green" icon={TrendingUp} />
      </KpiSection>

      {/* Analytics */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Carteira por status" description="Distribuição dos contratos">
          <DonutChart data={statusChart} />
          <ChartLegend items={statusChart.map((s) => ({ ...s, value: s.value }))} />
        </SectionCard>
        <SectionCard title="Recebimentos do mês" description="Previsto vs realizado">
          <FinanceBarChart data={recebChart} />
        </SectionCard>
      </div>

      {/* Operations */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Vencendo hoje"
          description="Contratos com vencimento na data de referência"
          noPadding
          action={
            <Link href="/admin/emprestimos?status=VENCENDO_HOJE" className="btn-ghost btn-sm">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.vencendoHojeLista.length === 0 ? (
            <EmptyState
              title="Nenhum vencimento hoje"
              description="Não há contratos vencendo na data de referência."
            />
          ) : (
            <DataTable
              columns={[
                { key: 'cliente', label: 'Cliente' },
                { key: 'contrato', label: 'Contrato' },
                { key: 'saldo', label: 'Saldo', align: 'right' },
              ]}
            >
              {data.vencendoHojeLista.map((item) => (
                <tr key={item.emprestimoId}>
                  <td className="font-medium text-slate-800">{item.clienteNome}</td>
                  <td>
                    <Link href={`/admin/emprestimos/${item.emprestimoId}`} className="font-medium text-primary hover:underline">
                      {item.numeroContrato}
                    </Link>
                  </td>
                  <td className="text-right font-semibold">{brl(item.saldoRestante)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </SectionCard>

        <SectionCard
          title="Inadimplência"
          description="Contratos com atraso ativo"
          noPadding
          action={
            <Link href="/admin/cobranca" className="btn-ghost btn-sm">
              Painel de cobrança <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.atrasadosLista.length === 0 ? (
            <EmptyState title="Carteira em dia" description="Nenhum contrato em atraso no momento." />
          ) : (
            <DataTable
              columns={[
                { key: 'cliente', label: 'Cliente' },
                { key: 'dias', label: 'Atraso' },
                { key: 'saldo', label: 'Saldo', align: 'right' },
              ]}
            >
              {data.atrasadosLista.map((item) => (
                <tr key={item.emprestimoId}>
                  <td className="font-medium">{item.clienteNome}</td>
                  <td className="font-semibold text-danger">{item.diasAtraso} dias</td>
                  <td className="text-right font-semibold text-danger">{brl(item.saldoRestante)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Últimos pagamentos"
          noPadding
          action={
            <Link href="/admin/recebimentos" className="btn-ghost btn-sm">
              Ver histórico <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.ultimosPagamentos.length === 0 ? (
            <EmptyState
              title="Nenhum pagamento recente"
              description="Os recebimentos confirmados aparecerão aqui."
              action={
                <Link href="/admin/recebimentos" className="btn-primary">
                  Registrar pagamento
                </Link>
              }
            />
          ) : (
            <DataTable
              columns={[
                { key: 'data', label: 'Data' },
                { key: 'cliente', label: 'Cliente' },
                { key: 'valor', label: 'Valor', align: 'right' },
              ]}
            >
              {data.ultimosPagamentos.map((p) => (
                <tr key={p.id}>
                  <td className="text-slate-600">{dataBR(p.dataPagamento)}</td>
                  <td>{p.clienteNome}</td>
                  <td className="text-right font-semibold text-success">{brl(p.valor)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </SectionCard>

        <SectionCard
          title="Últimos empréstimos"
          noPadding
          action={
            <Link href="/admin/emprestimos" className="btn-ghost btn-sm">
              Ver contratos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.ultimosEmprestimos.length === 0 ? (
            <EmptyState
              title="Nenhum empréstimo cadastrado"
              action={
                <Link href="/admin/emprestimos/novo" className="btn-primary">
                  Criar empréstimo
                </Link>
              }
            />
          ) : (
            <DataTable
              columns={[
                { key: 'contrato', label: 'Contrato' },
                { key: 'cliente', label: 'Cliente' },
                { key: 'status', label: 'Status' },
              ]}
            >
              {data.ultimosEmprestimos.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/admin/emprestimos/${e.id}`} className="font-medium text-primary hover:underline">
                      {e.numeroContrato}
                    </Link>
                  </td>
                  <td>{e.clienteNome}</td>
                  <td>
                    <StatusBadge status={e.status} size="sm" />
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
