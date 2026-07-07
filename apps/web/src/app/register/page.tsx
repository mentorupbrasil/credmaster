'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/AuthLayout';
import { FormField } from '@/components/ui';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    cpf: '',
    telefone: '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await api.register({ ...form, cpf: form.cpf.replace(/\D/g, '') });
      router.replace('/portal');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha no cadastro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Cadastre-se para acompanhar seus empréstimos."
      footer={
        <p className="text-center text-sm text-ink-subtle">
          Já tem conta?{' '}
          <Link href="/login" className="link">
            Fazer login
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {erro && (
          <div className="rounded-xl border border-danger/20 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {erro}
          </div>
        )}
        <FormField label="Nome completo">
          <input className="input" value={form.nome} onChange={set('nome')} required />
        </FormField>
        <FormField label="E-mail">
          <input className="input" type="email" value={form.email} onChange={set('email')} required />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="CPF">
            <input className="input" value={form.cpf} onChange={set('cpf')} placeholder="00000000000" required />
          </FormField>
          <FormField label="Telefone">
            <input className="input" value={form.telefone} onChange={set('telefone')} required />
          </FormField>
        </div>
        <FormField label="Senha" hint="Mín. 8 caracteres, com maiúscula, minúscula e número.">
          <input className="input" type="password" value={form.senha} onChange={set('senha')} required />
        </FormField>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>
    </AuthLayout>
  );
}
