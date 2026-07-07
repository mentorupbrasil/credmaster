'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Eye, MessageCircle, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { cpfMask, phoneMask, dataBR } from '@/lib/format';
import { whatsappLink, mensagemCobranca } from '@/lib/finance-ui';
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
} from '@/components/ui';

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  whatsapp?: string;
  status: string;
  observacoes?: string;
  createdAt: string;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'INADIMPLENTE', label: 'Inadimplente' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'EM_ANALISE', label: 'Em análise' },
  { value: 'BLOQUEADO', label: 'Bloqueado' },
  { value: 'REPROVADO', label: 'Reprovado' },
  { value: 'QUITADO', label: 'Quitado' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'name', label: 'Nome A–Z' },
  { value: 'status', label: 'Status' },
];

export default function ClientesPage() {
  const [lista, setLista] = useState<Cliente[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams({ pageSize: '20', page: String(page) });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      const res = await api.get<Paginated<Cliente>>(`/clientes?${params}`);
      setLista(res.data);
      setMeta({ total: res.meta.total, page: res.meta.page, totalPages: res.meta.totalPages });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }, [q, status, page]);

  useEffect(() => {
    const t = setTimeout(carregar, 300);
    return () => clearTimeout(t);
  }, [carregar]);

  useEffect(() => {
    setPage(1);
  }, [q, status]);

  const sorted = useMemo(() => {
    const copy = [...lista];
    if (sort === 'name') copy.sort((a, b) => a.nome.localeCompare(b.nome));
    else if (sort === 'status') copy.sort((a, b) => a.status.localeCompare(b.status));
    return copy;
  }, [lista, sort]);

  const ativos = lista.filter((c) => ['ATIVO', 'APROVADO'].includes(c.status)).length;
  const inad = lista.filter((c) => c.status === 'INADIMPLENTE').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle="Base completa de clientes, contratos e histórico financeiro"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Clientes' }]}
        actions={
          <Link href="/admin/clientes/novo" className="btn-primary">
            <Plus className="h-4 w-4" />
            Novo cliente
          </Link>
        }
      />

      <StatStrip
        items={[
          { label: 'Total na base', value: meta.total },
          { label: 'Nesta página', value: lista.length },
          { label: 'Ativos/aprovados', value: ativos, accent: 'text-success' },
          { label: 'Inadimplentes', value: inad, accent: 'text-danger' },
        ]}
      />

      <FilterBar>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Buscar por nome, CPF, e-mail ou WhatsApp…"
        />
        <div className="flex flex-wrap gap-2">
          <select className="select w-full sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select className="select w-full sm:w-40" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      {erro && <ErrorBox message={erro} onRetry={carregar} />}

      {loading ? (
        <PageSkeleton />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description={q || status ? 'Ajuste os filtros ou cadastre um novo cliente.' : 'Comece cadastrando seu primeiro cliente.'}
          action={
            <Link href="/admin/clientes/novo" className="btn-primary">
              Cadastrar cliente
            </Link>
          }
        />
      ) : (
        <>
          <DataTable
            columns={[
              { key: 'nome', label: 'Cliente' },
              { key: 'cpf', label: 'CPF' },
              { key: 'whatsapp', label: 'WhatsApp' },
              { key: 'status', label: 'Status' },
              { key: 'cadastro', label: 'Cadastro' },
              { key: 'acoes', label: '', align: 'right' },
            ]}
            footer={
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onPageChange={setPage}
              />
            }
          >
            {sorted.map((c) => {
              const tel = c.whatsapp ?? c.telefone;
              const wa = tel
                ? whatsappLink(tel, mensagemCobranca(c.nome, '—', '—'))
                : null;
              return (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/clientes/${c.id}`} className="font-semibold text-slate-900 hover:text-primary">
                      {c.nome}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-400">{c.email}</p>
                  </td>
                  <td className="font-mono text-sm text-slate-600">{cpfMask(c.cpf)}</td>
                  <td className="text-slate-600">{phoneMask(tel)}</td>
                  <td>
                    <StatusBadge status={c.status} size="sm" />
                  </td>
                  <td className="text-slate-500">{dataBR(c.createdAt)}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/clientes/${c.id}`} className="btn-icon" title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/admin/emprestimos/novo?clienteId=${c.id}`}
                        className="btn-icon"
                        title="Novo empréstimo"
                      >
                        <Wallet className="h-4 w-4" />
                      </Link>
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-icon" title="WhatsApp">
                          <MessageCircle className="h-4 w-4 text-success" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </>
      )}
    </div>
  );
}
