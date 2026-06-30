'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import { Spinner, ErrorBox, Stat } from '@/components/ui';

export default function RelatoriosPage() {
  const [aba, setAba] = useState<'carteira' | 'inadimplencia'>('carteira');
  const [carteira, setCarteira] = useState<any>(null);
  const [inad, setInad] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.get<any>('/relatorios/carteira').then(setCarteira).catch((e) => setErro(e.message));
    api.get<any>('/relatorios/inadimplencia').then(setInad).catch((e) => setErro(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Relatórios</h1>
      {erro && <ErrorBox message={erro} />}
      <div className="flex gap-2">
        <button className={aba === 'carteira' ? 'btn-primary' : 'btn-ghost'} onClick={() => setAba('carteira')}>
          Carteira
        </button>
        <button className={aba === 'inadimplencia' ? 'btn-primary' : 'btn-ghost'} onClick={() => setAba('inadimplencia')}>
          Inadimplência
        </button>
      </div>

      {aba === 'carteira' &&
        (!carteira ? (
          <Spinner />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Stat label="Contratos ativos" value={carteira.totalContratos} />
              <Stat label="Saldo total" value={brl(carteira.saldoTotal)} />
            </div>
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Contrato</th>
                    <th className="px-3 py-3">Cliente</th>
                    <th className="px-3 py-3">Principal</th>
                    <th className="px-3 py-3">Saldo devedor</th>
                    <th className="px-3 py-3">Data final</th>
                  </tr>
                </thead>
                <tbody>
                  {carteira.linhas.map((l: any) => (
                    <tr key={l.emprestimoId} className="border-b border-slate-100">
                      <td className="px-3 py-2">{l.numeroContrato}</td>
                      <td className="px-3 py-2">{l.cliente?.nome}</td>
                      <td className="px-3 py-2">{brl(l.principal)}</td>
                      <td className="px-3 py-2">{brl(l.saldoDevedor)}</td>
                      <td className="px-3 py-2">{dataBR(l.dataFinal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}

      {aba === 'inadimplencia' &&
        (!inad ? (
          <Spinner />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Stat label="Parcelas vencidas" value={inad.totalParcelas} accent="red" />
              <Stat label="Total em aberto" value={brl(inad.totalEmAberto)} accent="red" />
            </div>
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Contrato</th>
                    <th className="px-3 py-3">Cliente</th>
                    <th className="px-3 py-3">Parcela</th>
                    <th className="px-3 py-3">Vencimento</th>
                    <th className="px-3 py-3">Dias</th>
                    <th className="px-3 py-3">Em aberto</th>
                  </tr>
                </thead>
                <tbody>
                  {inad.linhas.map((l: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="px-3 py-2">{l.numeroContrato}</td>
                      <td className="px-3 py-2">{l.cliente?.nome}</td>
                      <td className="px-3 py-2">{l.parcela}</td>
                      <td className="px-3 py-2">{dataBR(l.vencimento)}</td>
                      <td className="px-3 py-2">{l.diasAtraso}</td>
                      <td className="px-3 py-2 font-medium text-red-600">{brl(l.totalEmAberto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}
    </div>
  );
}
