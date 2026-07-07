'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import {
  MetricCard,
  PageHeader,
  PageSkeleton,
  ErrorBox,
  DataTable,
  EmptyState,
  Tabs,
  FilterBar,
  FormField,
  DonutChart,
  ChartLegend,
} from '@/components/ui';

type Aba = 'carteira' | 'inadimplencia' | 'recebimentos';

function exportCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RelatoriosPage() {
  const [aba, setAba] = useState<Aba>('carteira');
  const [carteira, setCarteira] = useState<any>(null);
  const [inad, setInad] = useState<any>(null);
  const [receb, setReceb] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  const carregarCarteira = useCallback(() => {
    setLoading(true);
    api
      .get<any>('/relatorios/carteira')
      .then(setCarteira)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  const carregarInad = useCallback(() => {
    setLoading(true);
    api
      .get<any>('/relatorios/inadimplencia')
      .then(setInad)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  const carregarReceb = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (de) params.set('de', de);
    if (ate) params.set('ate', ate);
    api
      .get<any>(`/relatorios/recebimentos?${params}`)
      .then(setReceb)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, [de, ate]);

  useEffect(() => {
    setErro(null);
    if (aba === 'carteira') carregarCarteira();
    else if (aba === 'inadimplencia') carregarInad();
    else carregarReceb();
  }, [aba, carregarCarteira, carregarInad, carregarReceb]);

  function exportar() {
    if (aba === 'carteira' && carteira) {
      exportCsv(
        'carteira.csv',
        ['Contrato', 'Cliente', 'Principal', 'Saldo', 'Vencimento'],
        carteira.linhas.map((l: any) => [
          l.numeroContrato,
          l.cliente?.nome ?? '',
          String(l.principal),
          String(l.saldoDevedor),
          dataBR(l.dataFinal),
        ]),
      );
    } else if (aba === 'inadimplencia' && inad) {
      exportCsv(
        'inadimplencia.csv',
        ['Contrato', 'Cliente', 'Parcela', 'Vencimento', 'Dias', 'Em aberto'],
        inad.linhas.map((l: any) => [
          l.numeroContrato,
          l.cliente?.nome ?? '',
          String(l.parcela),
          dataBR(l.vencimento),
          String(l.diasAtraso),
          String(l.totalEmAberto),
        ]),
      );
    } else if (aba === 'recebimentos' && receb) {
      exportCsv(
        'recebimentos.csv',
        ['Data', 'Cliente', 'Contrato', 'Valor', 'Forma'],
        receb.pagamentos.map((p: any) => [
          dataBR(p.data),
          p.cliente?.nome ?? '',
          p.contrato,
          String(p.valor),
          p.forma,
        ]),
      );
    }
  }

  const tabs = [
    { key: 'carteira', label: 'Carteira ativa' },
    { key: 'inadimplencia', label: 'Inadimplência' },
    { key: 'recebimentos', label: 'Recebimentos' },
  ];

  const inadChart =
    inad?.linhas?.reduce(
      (acc: Record<string, number>, l: any) => {
        const faixa = l.diasAtraso <= 7 ? '1-7 dias' : l.diasAtraso <= 30 ? '8-30 dias' : '30+ dias';
        acc[faixa] = (acc[faixa] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ) ?? {};

  const inadChartData = Object.entries(inadChart).map(([name, value], i) => ({
    name,
    value: value as number,
    color: ['#D97706', '#DC2626', '#7F1D1D'][i] ?? '#64748B',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Análise executiva da carteira, inadimplência e fluxo de recebimentos"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Relatórios' }]}
        actions={
          <button type="button" className="btn-ghost" onClick={exportar}>
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        }
      />

      <Tabs tabs={tabs} active={aba} onChange={(k) => setAba(k as Aba)} />

      {aba === 'recebimentos' && (
        <FilterBar>
          <FormField label="De">
            <input className="input" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </FormField>
          <FormField label="Até">
            <input className="input" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </FormField>
          <div className="flex items-end">
            <button type="button" className="btn-primary" onClick={carregarReceb}>
              Aplicar período
            </button>
          </div>
        </FilterBar>
      )}

      {erro && <ErrorBox message={erro} onRetry={() => (aba === 'carteira' ? carregarCarteira() : aba === 'inadimplencia' ? carregarInad() : carregarReceb())} />}

      {loading ? (
        <PageSkeleton />
      ) : (
        <>
          {aba === 'carteira' && carteira && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard label="Contratos ativos" value={carteira.totalContratos} accent="blue" />
                <MetricCard label="Saldo total da carteira" value={brl(carteira.saldoTotal)} />
              </div>
              {carteira.linhas.length === 0 ? (
                <EmptyState title="Carteira vazia" description="Não há contratos ativos para exibir." />
              ) : (
                <DataTable
                  columns={[
                    { key: 'contrato', label: 'Contrato' },
                    { key: 'cliente', label: 'Cliente' },
                    { key: 'principal', label: 'Principal' },
                    { key: 'saldo', label: 'Saldo', align: 'right' },
                    { key: 'venc', label: 'Vencimento' },
                  ]}
                >
                  {carteira.linhas.map((l: any) => (
                    <tr key={l.emprestimoId}>
                      <td className="font-semibold">{l.numeroContrato}</td>
                      <td>{l.cliente?.nome}</td>
                      <td>{brl(l.principal)}</td>
                      <td className="text-right font-semibold">{brl(l.saldoDevedor)}</td>
                      <td>{dataBR(l.dataFinal)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </div>
          )}

          {aba === 'inadimplencia' && inad && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                  <MetricCard label="Parcelas vencidas" value={inad.totalParcelas} accent="red" />
                  <MetricCard label="Total em aberto" value={brl(inad.totalEmAberto)} accent="red" />
                </div>
                <div className="card-premium-padded">
                  <p className="mb-2 text-sm font-semibold text-slate-800">Faixa de atraso</p>
                  <DonutChart data={inadChartData} height={180} />
                  <ChartLegend items={inadChartData.map((d) => ({ ...d, value: d.value }))} />
                </div>
              </div>
              {inad.linhas.length === 0 ? (
                <EmptyState title="Sem inadimplência" />
              ) : (
                <DataTable
                  columns={[
                    { key: 'contrato', label: 'Contrato' },
                    { key: 'cliente', label: 'Cliente' },
                    { key: 'parcela', label: 'Parcela' },
                    { key: 'venc', label: 'Vencimento' },
                    { key: 'dias', label: 'Dias' },
                    { key: 'aberto', label: 'Em aberto', align: 'right' },
                  ]}
                >
                  {inad.linhas.map((l: any, i: number) => (
                    <tr key={i}>
                      <td>{l.numeroContrato}</td>
                      <td>{l.cliente?.nome}</td>
                      <td>{l.parcela}</td>
                      <td>{dataBR(l.vencimento)}</td>
                      <td className="font-semibold text-danger">{l.diasAtraso}</td>
                      <td className="text-right font-semibold text-danger">{brl(l.totalEmAberto)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </div>
          )}

          {aba === 'recebimentos' && receb && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard label="Quantidade" value={receb.quantidade} accent="green" />
                <MetricCard label="Total recebido" value={brl(receb.total)} accent="green" />
                <MetricCard
                  label="Período"
                  value={receb.periodo ? `${dataBR(receb.periodo.de)} — ${dataBR(receb.periodo.ate)}` : 'Completo'}
                />
              </div>
              {receb.pagamentos.length === 0 ? (
                <EmptyState title="Nenhum recebimento no período" />
              ) : (
                <DataTable
                  columns={[
                    { key: 'data', label: 'Data' },
                    { key: 'cliente', label: 'Cliente' },
                    { key: 'contrato', label: 'Contrato' },
                    { key: 'forma', label: 'Forma' },
                    { key: 'valor', label: 'Valor', align: 'right' },
                  ]}
                >
                  {receb.pagamentos.map((p: any) => (
                    <tr key={p.id}>
                      <td>{dataBR(p.data)}</td>
                      <td>{p.cliente?.nome}</td>
                      <td>{p.contrato}</td>
                      <td>{p.forma}</td>
                      <td className="text-right font-bold text-success">{brl(p.valor)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
