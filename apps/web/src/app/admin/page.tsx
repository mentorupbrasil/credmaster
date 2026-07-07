'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import {
  MetricCard,
  PageHeader,
  Spinner,
  ErrorBox,
  SectionCard,
  DataTable,
  StatusBadge,
  SimpleBarChart,
  EmptyState,
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

  useEffect(() => {
    api
      .get<DashboardData>('/dashboard')
      .then(setData)
      .catch((e) => setErro(e.message));
  }, []);

  if (erro) return <ErrorBox message={erro} />;
  if (!data) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Atualizado em ${dataBR(data.data)}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Clientes ativos" value={data.clientesAtivos} icon="👥" accent="blue" />
        <MetricCard label="Empréstimos ativos" value={data.emprestimosAtivos} icon="💰" />
        <MetricCard label="Valor total emprestado" value={brl(data.valorTotalEmprestado)} icon="📤" />
        <MetricCard label="Valor total a receber" value={brl(data.valorTotalReceber)} icon="📥" accent="blue" />
        <MetricCard label="Recebido no mês" value={brl(data.valorRecebidoNoMes)} icon="✅" accent="green" />
        <MetricCard label="Recebido hoje" value={brl(data.valorRecebidoHoje)} icon="💵" accent="green" />
        <MetricCard label="Em atraso" value={data.emAtraso} icon="⚠️" accent="red" />
        <MetricCard label="Vencendo hoje" value={data.vencendoHoje} icon="📅" accent="amber" />
        <MetricCard label="Vencendo em 7 dias" value={data.vencendoProximos7Dias} icon="🗓️" accent="amber" />
        <MetricCard label="Liquidados" value={data.liquidados} icon="✔️" accent="green" />
        <MetricCard label="Clientes pendentes" value={data.clientesPendentes} icon="⏳" accent="amber" />
        <MetricCard label="Carteira em atraso" value={brl(data.carteiraEmAtraso)} icon="🔴" accent="red" />
        <MetricCard label="Lucro previsto" value={brl(data.lucroPrevisto)} icon="📈" accent="blue" />
        <MetricCard label="Lucro recebido" value={brl(data.lucroRecebido)} icon="💹" accent="green" />
        <MetricCard label="Saldo em aberto" value={brl(data.saldoEmAberto)} icon="📊" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Status dos contratos">
          <SimpleBarChart
            items={[
              { label: 'Ativos', value: data.graficoStatus.ativos, color: '#2563EB' },
              { label: 'Atraso', value: data.graficoStatus.emAtraso, color: '#EF4444' },
              { label: 'Liquidados', value: data.graficoStatus.liquidados, color: '#10B981' },
              { label: 'Hoje', value: data.graficoStatus.vencendoHoje, color: '#F59E0B' },
            ]}
          />
        </SectionCard>
        <SectionCard title="Recebimento do mês">
          <SimpleBarChart
            items={[
              {
                label: 'Previsto',
                value: Number(data.graficoRecebimento.previsto),
                color: '#94A3B8',
              },
              {
                label: 'Recebido',
                value: Number(data.graficoRecebimento.recebidoMes),
                color: '#10B981',
              },
            ]}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Vencendo hoje">
          {data.vencendoHojeLista.length === 0 ? (
            <EmptyState title="Nenhum vencimento hoje" icon="✨" />
          ) : (
            <DataTable
              columns={[
                { key: 'cliente', label: 'Cliente' },
                { key: 'contrato', label: 'Contrato' },
                { key: 'saldo', label: 'Saldo', align: 'right' },
              ]}
            >
              {data.vencendoHojeLista.slice(0, 5).map((item) => (
                <tr key={item.emprestimoId}>
                  <td className="font-medium">{item.clienteNome}</td>
                  <td>
                    <Link
                      href={`/admin/emprestimos/${item.emprestimoId}`}
                      className="text-primary hover:underline"
                    >
                      {item.numeroContrato}
                    </Link>
                  </td>
                  <td className="text-right font-medium">{brl(item.saldoRestante)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </SectionCard>

        <SectionCard title="Em atraso">
          {data.atrasadosLista.length === 0 ? (
            <EmptyState title="Nenhum contrato em atraso" icon="✅" />
          ) : (
            <DataTable
              columns={[
                { key: 'cliente', label: 'Cliente' },
                { key: 'dias', label: 'Dias' },
                { key: 'saldo', label: 'Saldo', align: 'right' },
              ]}
            >
              {data.atrasadosLista.slice(0, 5).map((item) => (
                <tr key={item.emprestimoId}>
                  <td className="font-medium">{item.clienteNome}</td>
                  <td className="text-danger font-medium">{item.diasAtraso}d</td>
                  <td className="text-right font-medium text-danger">
                    {brl(item.saldoRestante)}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Últimos pagamentos">
          {data.ultimosPagamentos.length === 0 ? (
            <EmptyState title="Nenhum pagamento recente" />
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
                  <td>{dataBR(p.dataPagamento)}</td>
                  <td>{p.clienteNome}</td>
                  <td className="text-right font-medium text-success">{brl(p.valor)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </SectionCard>

        <SectionCard title="Últimos empréstimos">
          {data.ultimosEmprestimos.length === 0 ? (
            <EmptyState title="Nenhum empréstimo recente" />
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
                    <Link
                      href={`/admin/emprestimos/${e.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {e.numeroContrato}
                    </Link>
                  </td>
                  <td>{e.clienteNome}</td>
                  <td>
                    <StatusBadge status={e.status} />
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
