'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { dataBR } from '@/lib/format';
import { Spinner, ErrorBox } from '@/components/ui';

export default function NotificacoesPage() {
  const [lista, setLista] = useState<any[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await api.get<any[]>('/notificacoes');
      setLista(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function marcarLida(id: string) {
    await api.patch(`/notificacoes/${id}/lida`);
    carregar();
  }

  if (erro) return <ErrorBox message={erro} />;
  if (!lista) return <Spinner />;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Notificações</h1>
      {lista.length === 0 && (
        <div className="card text-center text-slate-500">Nenhuma notificação.</div>
      )}
      {lista.map((n) => (
        <div
          key={n.id}
          className={`card flex items-start justify-between ${n.lida ? 'opacity-60' : ''}`}
        >
          <div>
            <p className="font-semibold">{n.titulo}</p>
            <p className="text-sm text-slate-600">{n.mensagem}</p>
            <p className="mt-1 text-xs text-slate-400">{dataBR(n.createdAt)}</p>
          </div>
          {!n.lida && (
            <button className="btn-ghost !py-1" onClick={() => marcarLida(n.id)}>
              Marcar como lida
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
