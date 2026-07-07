'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader, ErrorBox } from '@/components/ui';
import { useFeedback } from '@/components/feedback';

export default function NovoClientePage() {
  const router = useRouter();
  const { toast } = useFeedback();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    whatsapp: '',
    email: '',
    rg: '',
    rendaMensal: '',
    dataNascimento: '',
    observacoes: '',
    logradouro: '',
    numero: '',
    cidade: '',
    uf: '',
    cep: '',
  });

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const payload: Record<string, unknown> = {
        nome: form.nome,
        cpf: form.cpf.replace(/\D/g, ''),
        telefone: form.telefone.replace(/\D/g, ''),
        email: form.email,
      };
      if (form.whatsapp) payload.whatsapp = form.whatsapp.replace(/\D/g, '');
      if (form.rg) payload.rg = form.rg;
      if (form.rendaMensal) payload.rendaMensal = Number(form.rendaMensal);
      if (form.dataNascimento) payload.dataNascimento = form.dataNascimento;
      if (form.observacoes) payload.observacoes = form.observacoes;
      if (form.logradouro) payload.logradouro = form.logradouro;
      if (form.numero) payload.numero = form.numero;
      if (form.cidade) payload.cidade = form.cidade;
      if (form.uf) payload.uf = form.uf.toUpperCase();
      if (form.cep) payload.cep = form.cep.replace(/\D/g, '');

      const cliente = await api.post<{ id: string }>('/clientes', payload);
      toast('Cliente criado com sucesso.', 'success');
      router.replace(`/admin/clientes/${cliente.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar cliente';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo cliente"
        subtitle="Cadastre um novo cliente no sistema"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Clientes', href: '/admin/clientes' }, { label: 'Novo' }]}
        actions={
          <Link href="/admin/clientes" className="btn-ghost">
            Voltar
          </Link>
        }
      />

      {erro && <ErrorBox message={erro} />}

      <form onSubmit={salvar} className="card-premium-padded space-y-8">
        <div>
          <h2 className="mb-4 text-base font-semibold text-ink">Dados pessoais</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome completo *">
              <input className="input" required value={form.nome} onChange={set('nome')} />
            </Field>
            <Field label="CPF *">
              <input className="input" required value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" />
            </Field>
            <Field label="E-mail *">
              <input className="input" type="email" required value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Telefone *">
              <input className="input" required value={form.telefone} onChange={set('telefone')} />
            </Field>
            <Field label="WhatsApp">
              <input className="input" value={form.whatsapp} onChange={set('whatsapp')} />
            </Field>
            <Field label="RG">
              <input className="input" value={form.rg} onChange={set('rg')} />
            </Field>
            <Field label="Data de nascimento">
              <input className="input" type="date" value={form.dataNascimento} onChange={set('dataNascimento')} />
            </Field>
            <Field label="Renda mensal (R$)">
              <input className="input" type="number" step="0.01" value={form.rendaMensal} onChange={set('rendaMensal')} />
            </Field>
          </div>
          <div className="mt-4">
            <label className="label">Observações</label>
            <textarea className="input min-h-[80px]" value={form.observacoes} onChange={set('observacoes')} />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-base font-semibold text-ink">Endereço</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="CEP">
              <input className="input" value={form.cep} onChange={set('cep')} />
            </Field>
            <Field label="Logradouro">
              <input className="input" value={form.logradouro} onChange={set('logradouro')} />
            </Field>
            <Field label="Número">
              <input className="input" value={form.numero} onChange={set('numero')} />
            </Field>
            <Field label="Cidade">
              <input className="input" value={form.cidade} onChange={set('cidade')} />
            </Field>
            <Field label="UF">
              <input className="input" maxLength={2} value={form.uf} onChange={set('uf')} placeholder="SP" />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/admin/clientes" className="btn-ghost">
            Cancelar
          </Link>
          <button type="submit" className="btn-primary" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Criar cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
