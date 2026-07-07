'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader, Spinner, ErrorBox, MetricCard } from '@/components/ui';
import { useFeedback } from '@/components/feedback';

interface Config {
  taxaJurosPadrao: string;
  valorAtrasoDiario: string;
  nomeSistema: string;
}

export default function ConfiguracoesPage() {
  const { toast } = useFeedback();
  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState<Config>({
    taxaJurosPadrao: '20',
    valorAtrasoDiario: '10',
    nomeSistema: 'CredMaster',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api
      .get<Config>('/parametros/config')
      .then((c) => {
        setConfig(c);
        setForm(c);
      })
      .catch((e) => setErro(e.message));
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const updated = await api.put<Config>('/parametros/config', form);
      setConfig(updated);
      setForm(updated);
      toast('Configurações salvas.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setSalvando(false);
    }
  }

  if (erro) return <ErrorBox message={erro} />;
  if (!config) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        subtitle="Parâmetros globais do sistema"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Taxa padrão"
          value={`${form.taxaJurosPadrao}%`}
          hint="Usada em novos empréstimos"
          accent="blue"
        />
        <MetricCard
          label="Encargo diário"
          value={`R$ ${form.valorAtrasoDiario}`}
          hint="Multa por dia de atraso"
          accent="amber"
        />
        <MetricCard label="Sistema" value={form.nomeSistema} />
      </div>

      <form onSubmit={salvar} className="card-premium max-w-xl space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Parâmetros</h2>

        <div>
          <label className="label">Taxa de juros padrão (%)</label>
          <input
            className="input"
            value={form.taxaJurosPadrao}
            onChange={(e) => setForm((f) => ({ ...f, taxaJurosPadrao: e.target.value }))}
          />
          <p className="mt-1 text-xs text-slate-400">Taxa aplicada por padrão em empréstimos simples (20% ou 30%).</p>
        </div>

        <div>
          <label className="label">Valor de atraso diário (R$)</label>
          <input
            className="input"
            value={form.valorAtrasoDiario}
            onChange={(e) => setForm((f) => ({ ...f, valorAtrasoDiario: e.target.value }))}
          />
          <p className="mt-1 text-xs text-slate-400">Encargo fixo cobrado por dia de atraso.</p>
        </div>

        <div>
          <label className="label">Nome do sistema</label>
          <input
            className="input"
            value={form.nomeSistema}
            onChange={(e) => setForm((f) => ({ ...f, nomeSistema: e.target.value }))}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </form>
    </div>
  );
}
