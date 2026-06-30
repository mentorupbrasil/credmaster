'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { brl, cpfMask, dataBR } from '@/lib/format';
import { Badge, Spinner, ErrorBox } from '@/components/ui';

export default function ClienteDetalhe({ params }: { params: { id: string } }) {
  const [cliente, setCliente] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<any>(`/clientes/${params.id}`)
      .then(setCliente)
      .catch((e) => setErro(e.message));
  }, [params.id]);

  if (erro) return <ErrorBox message={erro} />;
  if (!cliente) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{cliente.nome}</h1>
        <Badge status={cliente.status} />
      </div>

      <div className="card grid grid-cols-2 gap-4 md:grid-cols-3">
        <Info label="CPF" value={cpfMask(cliente.cpf)} />
        <Info label="E-mail" value={cliente.email} />
        <Info label="Telefone" value={cliente.telefone} />
        <Info label="Renda mensal" value={cliente.rendaMensal ? brl(cliente.rendaMensal) : '-'} />
        <Info label="Aprovado em" value={dataBR(cliente.aprovadoEm)} />
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Empréstimos</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Contrato</th>
                <th className="px-4 py-3">Principal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data final</th>
              </tr>
            </thead>
            <tbody>
              {cliente.emprestimos?.map((e: any) => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/emprestimos/${e.id}`} className="text-brand-600">
                      {e.numeroContrato}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{brl(e.valorPrincipal)}</td>
                  <td className="px-4 py-3">
                    <Badge status={e.status} />
                  </td>
                  <td className="px-4 py-3">{dataBR(e.dataFinal)}</td>
                </tr>
              ))}
              {(!cliente.emprestimos || cliente.emprestimos.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Sem empréstimos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {cliente.status === 'APROVADO' && (
          <Link href={`/admin/emprestimos/novo?clienteId=${cliente.id}`} className="btn-primary mt-3">
            Novo empréstimo
          </Link>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
