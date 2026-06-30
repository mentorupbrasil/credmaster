'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.esqueciSenha(email);
    } catch {
      // resposta é sempre genérica (anti-enumeração)
    } finally {
      setEnviado(true);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <h1 className="text-3xl font-bold">CredMaster</h1>
        </div>
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Redefinir senha</h2>
          {enviado ? (
            <p className="text-sm text-slate-600">
              Se houver uma conta associada a esse e-mail, enviaremos um link para
              redefinição da senha. Verifique sua caixa de entrada.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
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
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar link'}
              </button>
            </form>
          )}
          <p className="text-center text-sm text-slate-500">
            <Link href="/login" className="font-medium text-brand-600">
              Voltar ao login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
