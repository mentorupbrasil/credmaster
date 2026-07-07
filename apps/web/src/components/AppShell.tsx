'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: string;
}

export function AppShell({
  brandName = 'CredMaster',
  homeHref = '/admin',
  title,
  nav,
  userName,
  onLogout,
  children,
}: {
  brandName?: string;
  homeHref?: string;
  title: string;
  nav: NavItem[];
  userName?: string;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/admin'
      ? pathname === '/admin'
      : pathname === href || pathname.startsWith(href + '/');

  const currentPage = nav.find((item) => isActive(item.href))?.label ?? title;

  let lastSection = '';

  const navContent = (
    <>
      <div className="mb-10 px-1">
        <Link
          href={homeHref}
          className="group flex items-center gap-3.5"
          onClick={() => setMobileOpen(false)}
        >
          <div className="relative">
            <BrandMark className="h-11 w-11 shadow-glow transition-transform duration-300 group-hover:scale-[1.03]" />
            <span className="absolute -inset-1 -z-10 rounded-2xl bg-accent/20 opacity-0 blur-lg transition-opacity group-hover:opacity-100" />
          </div>
          <div>
            <p className="font-display text-[15px] font-bold tracking-tight text-white">{brandName}</p>
            <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-white/35">
              Private credit
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto pr-1">
        {nav.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;

          return (
            <div key={item.href}>
              {showSection && <p className="sidebar-section-label">{item.section}</p>}
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={active ? 'sidebar-link-active' : 'sidebar-link'}
              >
                <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                <span>{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-sidebar-border pt-5">
        <div className="glass-dark mb-3 flex items-center gap-3 rounded-2xl px-3.5 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-700 text-sm font-bold text-white shadow-glow-sm">
            {userName?.charAt(0)?.toUpperCase() ?? 'U'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{userName ?? 'Usuário'}</p>
            <p className="text-2xs font-medium uppercase tracking-wider text-white/35">Administrador</p>
          </div>
        </div>
        <button type="button" onClick={onLogout} className="sidebar-link w-full text-left">
          <LogOut className="h-[17px] w-[17px]" strokeWidth={1.75} />
          Encerrar sessão
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-surface bg-mesh-light">
      <aside className="relative hidden w-[var(--sidebar-width)] shrink-0 flex-col bg-sidebar bg-mesh-sidebar p-5 shadow-sidebar md:flex">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />
        <div className="relative flex h-full flex-col">{navContent}</div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-md md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col bg-sidebar bg-mesh-sidebar p-5 shadow-sidebar transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
      >
        <button
          type="button"
          className="mb-4 ml-auto rounded-xl p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
        {navContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 glass border-b border-border-subtle">
          <div className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="btn-icon md:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 border-l-0 md:border-l md:border-border-subtle md:pl-5">
                <p className="truncate font-display text-sm font-semibold text-ink">{currentPage}</p>
                <p className="truncate text-2xs font-medium uppercase tracking-wider text-ink-subtle">
                  {title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-xl border border-border bg-surface-elevated/80 px-3.5 py-2 text-2xs font-semibold uppercase tracking-wider text-ink-subtle shadow-xs sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-success" />
                {new Intl.DateTimeFormat('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                }).format(new Date())}
              </span>
              <button type="button" onClick={onLogout} className="btn-ghost btn-sm md:hidden">
                Sair
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <div className="page-shell-wide">{children}</div>
        </main>
      </div>
    </div>
  );
}
