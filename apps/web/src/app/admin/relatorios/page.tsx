'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import {
  MetricCard,
  PageHeader,
  Spinner,
  ErrorBox,
  DataTable,
  EmptyState,
} from '@/components/ui';

type Aba = 'carteira' | 'inadimplencia' | 'recebimentos';

function exportCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join(
    '\n',
  );
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

  const tabs: { key: Aba; label: string }[] = [
    { key: 'carteira', label: 'Carteira' },
    { key: 'inadimplencia', label: 'Inadimplência' },
    { key: 'recebimentos', label: 'Recebimentos' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Análise da carteira e recebimentos"
        actions={
          <button className="btn-ghost" onClick={exportar}>
            ⬇ Exportar CSV
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={aba === t.key ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setAba(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {aba === 'recebimentos' && (
        <div className="card-premium flex flex-wrap gap-3">
          <div>
            <label className="label">De</label>
            <input className="input" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div>
            <label className="label">Até</label>
            <input className="input" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button className="btn-primary" onClick={carregarReceb}>
              Filtrar
            </button>
          </div>
        </div>
      )}

      {erro && <ErrorBox message={erro} />}
      {loading ? (
        <Spinner />
      ) : (
        <>
          {aba === 'carteira' && carteira && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <MetricCard label="Contratos ativos" value={carteira.totalContratos} />
                <MetricCard label="Saldo total" value={brl(carteira.saldoTotal)} accent="blue" />
              </div>
              {carteira.linhas.length === 0 ? (
                <EmptyState title="Carteira vazia" />
              ) : (
                <DataTable
                  columns={[
                    { key: 'contrato', label: 'Contrato' },
                    { key: 'cliente', label: 'Cliente' },
                    { key: 'principal', label: 'Principal' },
                    { key: 'saldo', label: 'Saldo' },
                    { key: 'venc', label: 'Vencimento' },
                  ]}
                >
                  {carteira.linhas.map((l: any) => (
                    <tr key={l.emprestimoId}>
                      <td className="font-medium">{l.numeroContrato}</td>
                      <td>{l.cliente?.nome}</td>
                      <td>{brl(l.principal)}</td>
                      <td className="font-medium">{brl(l.saldoDevedor)}</td>
                      <td>{dataBR(l.dataFinal)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </div>
          )}

          {aba === 'inadimplencia' && inad && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <MetricCard label="Parcelas vencidas" value={inad.totalParcelas} accent="red" />
                <MetricCard label="Total em aberto" value={brl(inad.totalEmAberto)} accent="red" />
              </div>
              {inad.linhas.length === 0 ? (
                <EmptyState title="Sem inadimplência" icon="✅" />
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
                      <td className="text-danger">{l.diasAtraso}</td>
                      <td className="text-right font-medium text-danger">
                        {brl(l.totalEmAberto)}
                      </td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </div>
          )}

          {aba === 'recebimentos' && receb && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <MetricCard label="Quantidade" value={receb.quantidade} accent="green" />
                <MetricCard label="Total recebido" value={brl(receb.total)} accent="green" />
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
                      <td className="text-right font-medium text-success">{brl(p.valor)}</td>
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
