'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { brl, dataBR, percent } from '@/lib/format';
import { Badge, Spinner, ErrorBox, Stat } from '@/components/ui';

export default function PortalEmprestimo({ params }: { params: { id: string } }) {
  const [emp, setEmp] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<any>(`/emprestimos/meus/${params.id}`)
      .then(setEmp)
      .catch((e) => setErro(e.message));
  }, [params.id]);

  if (erro) return <ErrorBox message={erro} />;
  if (!emp) return <Spinner />;
  const r = emp.resumo;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{emp.numeroContrato}</h1>
        <Badge status={emp.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Saldo emprestado" value={brl(emp.valorPrincipal)} />
        <Stat label="Saldo devedor" value={brl(r.saldoDevedor)} />
        <Stat label="Próximo vencimento" value={dataBR(r.proximoVencimento)} />
        <Stat label="Valor devido" value={brl(r.valorProximaParcela)} />
        <Stat label="Dias em atraso" value={r.diasAtraso} accent={r.diasAtraso > 0 ? 'red' : 'default'} />
        <Stat label="Encargos acumulados" value={brl(r.encargosAcumulados)} accent="amber" />
        <Stat label="Prazo restante" value={`${r.prazoRestanteDias} dias`} />
        <Stat label="CET" value={`${percent(emp.cetMes)} a.m.`} hint={`${percent(emp.cetAno)} a.a.`} />
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Cronograma e histórico</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Vencimento</th>
                <th className="px-3 py-3">Valor</th>
                <th className="px-3 py-3">Encargos</th>
                <th className="px-3 py-3">Pago</th>
                <th className="px-3 py-3">Pago em</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {emp.parcelas.map((p: any) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{p.numero}</td>
                  <td className="px-3 py-2">{dataBR(p.vencimento)}</td>
                  <td className="px-3 py-2 font-medium">{brl(p.valorParcela)}</td>
                  <td className="px-3 py-2">{brl(Number(p.multa) + Number(p.jurosMora))}</td>
                  <td className="px-3 py-2">{brl(p.valorPago)}</td>
                  <td className="px-3 py-2">{p.dataPagamento ? dataBR(p.dataPagamento) : '-'}</td>
                  <td className="px-3 py-2">
                    <Badge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
