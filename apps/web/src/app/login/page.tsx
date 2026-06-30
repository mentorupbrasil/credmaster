'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const user = await api.login(email, senha);
      router.replace(user.role === 'CLIENTE' ? '/portal' : '/admin');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha no login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <h1 className="text-3xl font-bold">CredMaster</h1>
          <p className="text-brand-100">Gestão de crédito</p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4">
          <h2 className="text-lg font-semibold">Entrar</h2>
          {erro && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </div>
          )}
          <div>
            <label className="label">E-mail</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Senha</label>
            <input
              className="input"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
          <p className="text-center text-sm text-slate-500">
            Não tem conta?{' '}
            <Link href="/register" className="font-medium text-brand-600">
              Cadastre-se
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
