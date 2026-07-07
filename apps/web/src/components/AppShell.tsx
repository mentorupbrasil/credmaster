'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: string;
}

export function AppShell({
  brandName = 'CredMaster',
  title,
  nav,
  userName,
  onLogout,
  children,
}: {
  brandName?: string;
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
      <div className="mb-8 px-1">
        <Link href="/admin" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-800 text-lg font-bold text-white shadow-glow">
            {brandName.charAt(0)}
          </span>
          <div>
            <p className="text-base font-bold tracking-tight text-white">{brandName}</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Gestão financeira
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;

          return (
            <div key={item.href}>
              {showSection && (
                <p className="sidebar-section-label">{item.section}</p>
              )}
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={active ? 'sidebar-link-active' : 'sidebar-link'}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2 : 1.75} />
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-200" />
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-sidebar-border pt-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-sidebar-border bg-white/[0.04] px-3 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/80 to-primary text-sm font-bold text-white">
            {userName?.charAt(0)?.toUpperCase() ?? 'U'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{userName ?? 'Usuário'}</p>
            <p className="text-xs text-slate-500">Administrador</p>
          </div>
        </div>
        <button type="button" onClick={onLogout} className="sidebar-link w-full text-left">
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-[var(--sidebar-width)] shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 shadow-sidebar md:flex">
        {navContent}
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col border-r border-sidebar-border bg-sidebar p-4 shadow-sidebar transition-transform duration-200 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          className="mb-4 ml-auto rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
        {navContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="btn-icon md:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{currentPage}</p>
                <p className="truncate text-xs text-slate-400">{title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline">
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="page-shell-wide">{children}</div>
        </main>
      </div>
    </div>
  );
}
