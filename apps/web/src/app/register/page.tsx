'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900 p-4">
      <form onSubmit={onSubmit} className="card w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">Criar conta</h2>
        {erro && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>
        )}
        <div>
          <label className="label">Nome completo</label>
          <input className="input" value={form.nome} onChange={set('nome')} required />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" value={form.email} onChange={set('email')} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">CPF</label>
            <input className="input" value={form.cpf} onChange={set('cpf')} placeholder="Somente dígitos" required />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input className="input" value={form.telefone} onChange={set('telefone')} required />
          </div>
        </div>
        <div>
          <label className="label">Senha</label>
          <input className="input" type="password" value={form.senha} onChange={set('senha')} required />
          <p className="mt-1 text-xs text-slate-400">Mín. 8 caracteres, com maiúscula, minúscula e número.</p>
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Enviando…' : 'Cadastrar'}
        </button>
        <p className="text-center text-sm text-slate-500">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-brand-600">
            Entrar
          </Link>
        </p>
      </form>
    </main>
  );
}
