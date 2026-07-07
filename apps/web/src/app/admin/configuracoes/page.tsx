'use client';

import { useEffect, useState } from 'react';
import { Save, Settings2, Wallet, PhoneCall } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader, PageSkeleton, ErrorBox, MetricCard, SectionCard, FormField, Tabs } from '@/components/ui';
import { useFeedback } from '@/components/feedback';

interface Config {
  taxaJurosPadrao: string;
  valorAtrasoDiario: string;
  nomeSistema: string;
}

type Secao = 'sistema' | 'financeiro' | 'cobranca';

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
  const [secao, setSecao] = useState<Secao>('sistema');
  const [msgCobranca, setMsgCobranca] = useState(
    'Olá, {nome}. Tudo bem? Estou passando para lembrar que seu contrato no valor de {valor} está em aberto desde {vencimento}. Poderia me dar um retorno sobre o pagamento?',
  );

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
      toast('Configurações salvas com sucesso.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    } finally {
      setSalvando(false);
    }
  }

  if (erro) return <ErrorBox message={erro} />;
  if (!config) return <PageSkeleton />;

  const tabs = [
    { key: 'sistema', label: 'Sistema' },
    { key: 'financeiro', label: 'Financeiro' },
    { key: 'cobranca', label: 'Cobrança' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        subtitle="Parâmetros globais, regras financeiras e preferências do sistema"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Configurações' }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Taxa padrão" value={`${form.taxaJurosPadrao}%`} hint="Novos empréstimos simples" accent="blue" icon={Wallet} />
        <MetricCard label="Encargo diário" value={`R$ ${form.valorAtrasoDiario}`} hint="Multa por dia de atraso" accent="amber" icon={Settings2} />
        <MetricCard label="Nome do sistema" value={form.nomeSistema} icon={PhoneCall} />
      </div>

      <Tabs tabs={tabs} active={secao} onChange={(k) => setSecao(k as Secao)} />

      <form onSubmit={salvar} className="space-y-6">
        {secao === 'sistema' && (
          <SectionCard title="Identidade do sistema" description="Nome exibido no painel administrativo">
            <FormField label="Nome do sistema" hint="Aparece na sidebar e cabeçalho (usuários ADMIN)">
              <input
                className="input max-w-md"
                value={form.nomeSistema}
                onChange={(e) => setForm((f) => ({ ...f, nomeSistema: e.target.value }))}
              />
            </FormField>
          </SectionCard>
        )}

        {secao === 'financeiro' && (
          <SectionCard title="Regras financeiras" description="Valores padrão para novos contratos">
            <div className="grid max-w-2xl gap-4">
              <FormField label="Taxa de juros padrão (%)" hint="Usada em empréstimos simples — ex.: 20% ou 30%">
                <input
                  className="input"
                  value={form.taxaJurosPadrao}
                  onChange={(e) => setForm((f) => ({ ...f, taxaJurosPadrao: e.target.value }))}
                />
              </FormField>
              <FormField label="Valor de atraso diário (R$)" hint="Encargo fixo somado por dia após o vencimento">
                <input
                  className="input"
                  value={form.valorAtrasoDiario}
                  onChange={(e) => setForm((f) => ({ ...f, valorAtrasoDiario: e.target.value }))}
                />
              </FormField>
            </div>
          </SectionCard>
        )}

        {secao === 'cobranca' && (
          <SectionCard title="Template de cobrança" description="Modelo de mensagem WhatsApp (referência local — use {nome}, {valor}, {vencimento})">
            <FormField label="Mensagem padrão">
              <textarea
                className="textarea"
                value={msgCobranca}
                onChange={(e) => setMsgCobranca(e.target.value)}
                rows={5}
              />
            </FormField>
            <p className="mt-2 text-xs text-slate-400">
              A API de cobrança já gera mensagens automáticas. Este template serve como referência operacional.
            </p>
          </SectionCard>
        )}

        {(secao === 'sistema' || secao === 'financeiro') && (
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={salvando}>
              <Save className="h-4 w-4" />
              {salvando ? 'Salvando…' : 'Salvar configurações'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
