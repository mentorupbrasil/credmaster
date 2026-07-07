'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthLayout } from '@/components/AuthLayout';
import { FormField } from '@/components/ui';
import { api } from '@/lib/api';
import { CheckCircle2 } from 'lucide-react';

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
      // resposta genérica anti-enumeração
    } finally {
      setEnviado(true);
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Redefinir senha"
      subtitle="Informe seu e-mail e enviaremos instruções se a conta existir."
      footer={
        <p className="text-center text-sm text-ink-subtle">
          <Link href="/login" className="link">
            Voltar ao login
          </Link>
        </p>
      }
    >
      {enviado ? (
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success-50 text-success">
            <CheckCircle2 className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <p className="text-sm leading-relaxed text-ink-muted">
            Se houver uma conta associada a esse e-mail, enviaremos um link para redefinição.
            Verifique sua caixa de entrada.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <FormField label="E-mail">
            <input
              className="input"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormField>
          <button type="submit" className="btn-primary w-full !py-3" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar link de redefinição'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
