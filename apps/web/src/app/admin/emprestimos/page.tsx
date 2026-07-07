'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import {
  DataTable,
  PageHeader,
  PageSkeleton,
  ErrorBox,
  StatusBadge,
  FilterBar,
  SearchInput,
  StatStrip,
  Pagination,
  EmptyState,
  MetricCard,
} from '@/components/ui';

export default function EmprestimosPage() {
  const [lista, setLista] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams({ pageSize: '20', page: String(page) });
      if (status) params.set('status', status);
      if (clienteId) params.set('clienteId', clienteId);
      const r = await api.get<any>(`/emprestimos?${params}`);
      setLista(r.data);
      setMeta({ total: r.meta.total, page: r.meta.page, totalPages: r.meta.totalPages });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }, [status, clienteId, page]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    api.get<any>('/clientes?pageSize=100').then((r) => setClientes(r.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [status, clienteId]);

  const filtered = useMemo(() => {
    if (!busca.trim()) return lista;
    const q = busca.toLowerCase();
    return lista.filter(
      (e) =>
        e.numeroContrato?.toLowerCase().includes(q) ||
        e.cliente?.nome?.toLowerCase().includes(q),
    );
  }, [lista, busca]);

  const totalPrincipal = filtered.reduce((a, e) => a + Number(e.valorPrincipal ?? 0), 0);
  const emAtraso = filtered.filter((e) => e.status === 'EM_ATRASO').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empréstimos"
        subtitle="Contratos ativos, vencimentos, saldos e operações"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Empréstimos' }]}
        actions={
          <Link href="/admin/emprestimos/novo" className="btn-primary">
            <Plus className="h-4 w-4" /> Novo empréstimo
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Contratos listados" value={meta.total} accent="blue" />
        <MetricCard label="Principal (página)" value={brl(totalPrincipal)} />
        <MetricCard label="Em atraso (página)" value={emAtraso} accent={emAtraso ? 'red' : 'default'} />
        <MetricCard label="Página" value={`${meta.page} / ${meta.totalPages}`} />
      </div>

      <FilterBar>
        <SearchInput value={busca} onChange={setBusca} placeholder="Buscar contrato ou cliente…" />
        <div className="flex flex-wrap gap-2">
          <select className="select w-full sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="ATIVO">Ativo</option>
            <option value="EM_ATRASO">Em atraso</option>
            <option value="VENCENDO_HOJE">Vencendo hoje</option>
            <option value="LIQUIDADO">Liquidado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
          <select className="select w-full sm:w-48" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Todos os clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      </FilterBar>

      {erro && <ErrorBox message={erro} onRetry={carregar} />}

      {loading ? (
        <PageSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum empréstimo encontrado"
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
            { key: 'principal', label: 'Principal' },
            { key: 'total', label: 'Total original' },
            { key: 'saldo', label: 'Saldo', align: 'right' },
            { key: 'status', label: 'Status' },
            { key: 'venc', label: 'Vencimento' },
            { key: 'acoes', label: '', align: 'right' },
          ]}
          footer={
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
          }
        >
          {filtered.map((e) => (
            <tr key={e.id}>
              <td>
                <Link href={`/admin/emprestimos/${e.id}`} className="font-semibold text-primary hover:underline">
                  {e.numeroContrato}
                </Link>
              </td>
              <td>
                <Link href={`/admin/clientes/${e.cliente?.id}`} className="text-slate-700 hover:text-primary">
                  {e.cliente?.nome}
                </Link>
              </td>
              <td>{brl(e.valorPrincipal)}</td>
              <td className="text-slate-600">{brl(e.totalAPagar ?? e.valorPrincipal)}</td>
              <td className="text-right font-semibold">{brl(e.saldoDevedor ?? e.totalAPagar)}</td>
              <td><StatusBadge status={e.status} size="sm" /></td>
              <td className={e.status === 'VENCENDO_HOJE' ? 'font-semibold text-warning' : ''}>
                {dataBR(e.dataFinal)}
              </td>
              <td className="text-right">
                <Link href={`/admin/emprestimos/${e.id}`} className="btn-icon" title="Ver contrato">
                  <Eye className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
