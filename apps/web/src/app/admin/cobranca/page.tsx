'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { dataBR } from '@/lib/format';
import { Badge, Spinner, ErrorBox } from '@/components/ui';

export default function CobrancaPage() {
  const [execucoes, setExecucoes] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [rodando, setRodando] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    try {
      const r = await api.get<any[]>('/cobranca/execucoes');
      setExecucoes(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function executar() {
    setRodando(true);
    setErro(null);
    try {
      await api.post('/cobranca/executar', {});
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setRodando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cobrança</h1>
        <button className="btn-primary" onClick={executar} disabled={rodando}>
          {rodando ? 'Executando…' : 'Executar rotina agora'}
        </button>
      </div>
      <p className="text-sm text-slate-500">
        A rotina diária roda automaticamente. Aqui você pode disparar manualmente
        (idempotente) e acompanhar as execuções.
      </p>
      {erro && <ErrorBox message={erro} />}
      {loading ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-slate-500">
              <tr>
                <th className="px-3 py-3">Referência</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Início</th>
                <th className="px-3 py-3">Fim</th>
                <th className="px-3 py-3">Estatísticas</th>
              </tr>
            </thead>
            <tbody>
              {execucoes.map((e) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{e.chave}</td>
                  <td className="px-3 py-2">
                    <Badge status={e.status} />
                  </td>
                  <td className="px-3 py-2">{dataBR(e.iniciadoEm)}</td>
                  <td className="px-3 py-2">{e.finalizadoEm ? dataBR(e.finalizadoEm) : '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {e.stats ? JSON.stringify(e.stats) : '-'}
                  </td>
                </tr>
              ))}
              {execucoes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                    Nenhuma execução ainda.
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
