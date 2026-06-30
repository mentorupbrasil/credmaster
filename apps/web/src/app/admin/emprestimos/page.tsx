'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import { Badge, Spinner, ErrorBox } from '@/components/ui';

export default function EmprestimosPage() {
  const [lista, setLista] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<any>('/emprestimos?pageSize=50')
      .then((r) => setLista(r.data))
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Empréstimos</h1>
        <Link href="/admin/emprestimos/novo" className="btn-primary">
          Novo empréstimo
        </Link>
      </div>
      {erro && <ErrorBox message={erro} />}
      {loading ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Contrato</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Principal</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data final</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/emprestimos/${e.id}`} className="text-brand-600">
                      {e.numeroContrato}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{e.cliente?.nome}</td>
                  <td className="px-4 py-3">{brl(e.valorPrincipal)}</td>
                  <td className="px-4 py-3">{e.tipoAmortizacao}</td>
                  <td className="px-4 py-3">
                    <Badge status={e.status} />
                  </td>
                  <td className="px-4 py-3">{dataBR(e.dataFinal)}</td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Nenhum empréstimo.
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
