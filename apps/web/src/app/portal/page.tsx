'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import { Badge, Spinner, ErrorBox, Stat } from '@/components/ui';

export default function PortalHome() {
  const [perfil, setPerfil] = useState<any>(null);
  const [emprestimos, setEmprestimos] = useState<any[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.get<any>('/clientes/me').then(setPerfil).catch(() => undefined);
    api
      .get<any[]>('/emprestimos/meus')
      .then(setEmprestimos)
      .catch((e) => setErro(e.message));
  }, []);

  if (erro) return <ErrorBox message={erro} />;

  if (perfil && perfil.status !== 'APROVADO') {
    return (
      <div className="card mx-auto max-w-lg text-center">
        <h1 className="text-xl font-bold">Cadastro em análise</h1>
        <p className="mt-2 text-slate-500">
          Seu cadastro está com status <Badge status={perfil.status} />. Assim que for
          aprovado você poderá acompanhar seus empréstimos aqui.
        </p>
        {perfil.motivoReprovacao && (
          <p className="mt-3 text-sm text-red-600">Motivo: {perfil.motivoReprovacao}</p>
        )}
      </div>
    );
  }

  if (!emprestimos) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Olá, {perfil?.nome?.split(' ')[0] ?? 'cliente'} 👋
      </h1>

      {emprestimos.length === 0 && (
        <div className="card text-center text-slate-500">
          Você ainda não possui empréstimos ativos.
        </div>
      )}

      {emprestimos.map((e) => {
        const r = e.resumo;
        return (
          <div key={e.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{e.numeroContrato}</h2>
              <Badge status={e.status} />
              <Link
                href={`/portal/emprestimos/${e.id}`}
                className="ml-auto text-sm font-medium text-brand-600"
              >
                Ver detalhes →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              <Stat label="Saldo emprestado" value={brl(e.valorPrincipal)} />
              <Stat label="Saldo devedor" value={brl(r.saldoDevedor)} />
              <Stat label="Próximo vencimento" value={dataBR(r.proximoVencimento)} />
              <Stat label="Valor devido" value={brl(r.valorProximaParcela)} />
              <Stat
                label="Dias em atraso"
                value={r.diasAtraso}
                accent={r.diasAtraso > 0 ? 'red' : 'default'}
              />
              <Stat label="Encargos" value={brl(r.encargosAcumulados)} accent="amber" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
