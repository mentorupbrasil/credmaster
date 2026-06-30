'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cpfMask } from '@/lib/format';
import { Badge, Spinner, ErrorBox } from '@/components/ui';

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  status: string;
}
interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; totalPages: number };
}

export default function ClientesPage() {
  const [lista, setLista] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Paginated<Cliente>>(
        `/clientes?pageSize=50${q ? `&q=${encodeURIComponent(q)}` : ''}`,
      );
      setLista(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function aprovar(id: string) {
    await api.post(`/clientes/${id}/aprovar`);
    carregar();
  }
  async function reprovar(id: string) {
    const motivo = prompt('Motivo da reprovação:');
    if (!motivo) return;
    await api.post(`/clientes/${id}/reprovar`, { motivo });
    carregar();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <input
          className="input max-w-xs"
          placeholder="Buscar por nome, CPF ou e-mail"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {erro && <ErrorBox message={erro} />}
      {loading ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/clientes/${c.id}`} className="text-brand-600">
                      {c.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{cpfMask(c.cpf)}</td>
                  <td className="px-4 py-3">{c.email}</td>
                  <td className="px-4 py-3">
                    <Badge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(c.status === 'PENDENTE' || c.status === 'EM_ANALISE') && (
                      <div className="flex justify-end gap-2">
                        <button className="btn-primary !py-1" onClick={() => aprovar(c.id)}>
                          Aprovar
                        </button>
                        <button className="btn-danger !py-1" onClick={() => reprovar(c.id)}>
                          Reprovar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
