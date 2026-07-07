'use client';

import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { Shield, LineChart, Users } from 'lucide-react';

const FEATURES = [
  {
    icon: Shield,
    title: 'Controle total da carteira',
    desc: 'Contratos, juros, multas e status automáticos em tempo real.',
  },
  {
    icon: LineChart,
    title: 'Visão financeira clara',
    desc: 'Dashboard executivo com KPIs, inadimplência e fluxo de caixa.',
  },
  {
    icon: Users,
    title: 'Operação profissional',
    desc: 'Clientes, cobrança via WhatsApp e recebimentos integrados.',
  },
];

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Painel de marca */}
      <aside className="relative hidden w-[46%] max-w-xl flex-col justify-between overflow-hidden bg-sidebar bg-mesh-sidebar p-12 lg:flex xl:max-w-2xl xl:p-14">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
        <div className="pointer-events-none absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-accent/20 blur-[100px]" />

        <div className="relative">
          <Link href="/login" className="inline-flex items-center gap-3.5">
            <BrandMark className="h-12 w-12 shadow-glow" />
            <div>
              <p className="font-display text-lg font-bold text-white">CredMaster</p>
              <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-white/35">
                Private credit OS
              </p>
            </div>
          </Link>
        </div>

        <div className="relative space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
              Gestão de crédito
              <span className="block text-accent-300">no nível enterprise.</span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/50">
              Plataforma completa para empréstimos particulares — carteira, cobrança,
              recebimentos e relatórios em um só lugar.
            </p>
          </div>

          <ul className="space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-accent-300">
                  <f.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white/90">{f.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-white/40">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-2xs font-medium uppercase tracking-wider text-white/25">
          © {new Date().getFullYear()} CredMaster · Todos os direitos reservados
        </p>
      </aside>

      {/* Formulário */}
      <main className="flex flex-1 flex-col items-center justify-center bg-surface bg-mesh-light px-5 py-10 sm:px-8">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <BrandMark className="h-10 w-10" />
          <span className="font-display text-lg font-bold text-ink">CredMaster</span>
        </div>

        <div className="auth-card w-full max-w-[420px] animate-slide-up">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h2>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{subtitle}</p>
            )}
          </div>
          {children}
          {footer && <div className="mt-8 border-t border-border-subtle pt-6">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
