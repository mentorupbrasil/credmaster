'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import { DataTable, PageHeader, Spinner, ErrorBox, StatusBadge } from '@/components/ui';

export default function EmprestimosPage() {
  const [lista, setLista] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ pageSize: '50' });
    if (status) params.set('status', status);
    api
      .get<any>(`/emprestimos?${params}`)
      .then((r) => setLista(r.data))
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empréstimos"
        subtitle="Contratos e saldos em aberto"
        actions={
          <Link href="/admin/emprestimos/novo" className="btn-primary">
            + Novo empréstimo
          </Link>
        }
      />

      <div className="card-premium">
        <select
          className="select max-w-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="ATIVO">Ativo</option>
          <option value="EM_ATRASO">Em atraso</option>
          <option value="VENCENDO_HOJE">Vencendo hoje</option>
          <option value="LIQUIDADO">Liquidado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      {erro && <ErrorBox message={erro} />}
      {loading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={[
            { key: 'contrato', label: 'Contrato' },
            { key: 'cliente', label: 'Cliente' },
            { key: 'principal', label: 'Principal' },
            { key: 'saldo', label: 'Saldo' },
            { key: 'status', label: 'Status' },
            { key: 'vencimento', label: 'Vencimento' },
          ]}
          empty="Nenhum empréstimo encontrado."
        >
          {lista.map((e) => (
            <tr key={e.id}>
              <td>
                <Link
                  href={`/admin/emprestimos/${e.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {e.numeroContrato}
                </Link>
              </td>
              <td>{e.cliente?.nome}</td>
              <td>{brl(e.valorPrincipal)}</td>
              <td className="font-medium">{brl(e.saldoDevedor ?? e.totalAPagar)}</td>
              <td>
                <StatusBadge status={e.status} />
              </td>
              <td>{dataBR(e.dataFinal)}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
