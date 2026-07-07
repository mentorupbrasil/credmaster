'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/AuthLayout';
import { FormField } from '@/components/ui';
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
    <AuthLayout
      title="Entrar"
      subtitle="Use suas credenciais para acessar o painel."
      footer={
        <p className="text-center text-sm text-ink-subtle">
          Não tem conta?{' '}
          <Link href="/register" className="link">
            Cadastre-se
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {erro && (
          <div className="rounded-lg border border-danger/20 bg-danger-50 px-3 py-2.5 text-sm text-danger-700">
            {erro}
          </div>
        )}
        <FormField label="E-mail">
          <input
            className="input"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Senha">
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </FormField>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <div className="flex items-center justify-between text-sm">
          <Link href="/esqueci-senha" className="link-subtle">
            Esqueci a senha
          </Link>
          <Link href="/simular" className="link-subtle">
            Simular crédito
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
