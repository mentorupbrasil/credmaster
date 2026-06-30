'use client';

import React from 'react';

export function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: 'default' | 'green' | 'red' | 'amber';
}) {
  const color =
    accent === 'green'
      ? 'text-emerald-600'
      : accent === 'red'
        ? 'text-red-600'
        : accent === 'amber'
          ? 'text-amber-600'
          : 'text-slate-900';
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  APROVADO: 'bg-emerald-100 text-emerald-700',
  ATIVO: 'bg-emerald-100 text-emerald-700',
  PAGA: 'bg-emerald-100 text-emerald-700',
  LIQUIDADO: 'bg-blue-100 text-blue-700',
  PENDENTE: 'bg-slate-100 text-slate-600',
  EM_ANALISE: 'bg-amber-100 text-amber-700',
  AGUARDANDO_APROVACAO: 'bg-amber-100 text-amber-700',
  PARCIAL: 'bg-amber-100 text-amber-700',
  VENCIDA: 'bg-red-100 text-red-700',
  EM_ATRASO: 'bg-red-100 text-red-700',
  INADIMPLENTE: 'bg-red-100 text-red-700',
  REPROVADO: 'bg-red-100 text-red-700',
  BLOQUEADO: 'bg-red-100 text-red-700',
  CANCELADA: 'bg-slate-200 text-slate-500',
  CANCELADO: 'bg-slate-200 text-slate-500',
};

export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return <p className="py-10 text-center text-sm text-slate-400">{label}</p>;
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div>
  );
}
