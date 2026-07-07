'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cpfMask, phoneMask } from '@/lib/format';
import { DataTable, PageHeader, Spinner, ErrorBox, StatusBadge } from '@/components/ui';

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  whatsapp?: string;
  status: string;
  rendaMensal?: string;
  observacoes?: string;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; totalPages: number };
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'EM_ANALISE', label: 'Em análise' },
  { value: 'BLOQUEADO', label: 'Bloqueado' },
  { value: 'REPROVADO', label: 'Reprovado' },
];

export default function ClientesPage() {
  const [lista, setLista] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams({ pageSize: '50' });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      const res = await api.get<Paginated<Cliente>>(`/clientes?${params}`);
      setLista(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(carregar, 300);
    return () => clearTimeout(t);
  }, [carregar]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle="Gerencie sua base de clientes"
        actions={
          <Link href="/admin/clientes/novo" className="btn-primary">
            + Novo cliente
          </Link>
        }
      />

      <div className="card-premium flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="input flex-1"
          placeholder="Buscar por nome, CPF ou e-mail…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="select sm:w-48"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {erro && <ErrorBox message={erro} />}

      {loading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={[
            { key: 'nome', label: 'Nome' },
            { key: 'cpf', label: 'CPF' },
            { key: 'whatsapp', label: 'WhatsApp' },
            { key: 'status', label: 'Status' },
            { key: 'resumo', label: 'Resumo' },
          ]}
          empty="Nenhum cliente encontrado."
        >
          {lista.map((c) => (
            <tr key={c.id}>
              <td className="font-medium">
                <Link href={`/admin/clientes/${c.id}`} className="text-primary hover:underline">
                  {c.nome}
                </Link>
              </td>
              <td className="text-slate-600">{cpfMask(c.cpf)}</td>
              <td className="text-slate-600">{phoneMask(c.whatsapp ?? c.telefone)}</td>
              <td>
                <StatusBadge status={c.status} />
              </td>
              <td className="max-w-[200px] truncate text-slate-500">
                {c.observacoes?.slice(0, 40) || c.email}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
