'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { ThemeToggle } from '@/components/ThemeToggle';

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
      <div className="mb-6 border-b border-sidebar-border px-2 pb-5">
        <Link
          href={homeHref}
          className="flex items-center gap-2.5"
          onClick={() => setMobileOpen(false)}
        >
          <BrandMark className="h-9 w-9" />
          <div>
            <p className="font-display text-sm font-semibold text-ink">{brandName}</p>
            <p className="text-2xs text-ink-faint">Painel administrativo</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
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
                <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                <span>{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-sidebar-border px-2 pt-4">
        <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-surface px-2.5 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs font-semibold text-white">
            {userName?.charAt(0)?.toUpperCase() ?? 'U'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{userName ?? 'Usuário'}</p>
            <p className="text-2xs text-ink-faint">Administrador</p>
          </div>
          <ThemeToggle />
        </div>
        <button type="button" onClick={onLogout} className="sidebar-link w-full text-left">
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <aside className="hidden h-screen w-[var(--sidebar-width)] shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-full min-h-0 flex-col py-5">{navContent}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[var(--sidebar-width)] flex-col overflow-hidden border-r border-sidebar-border bg-sidebar py-5 transition-transform md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          className="mb-2 ml-auto mr-3 rounded-lg p-2 text-ink-subtle hover:bg-surface-muted"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex h-full min-h-0 flex-col px-2">{navContent}</div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-border bg-sidebar">
          <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="btn-icon md:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="truncate text-sm font-semibold text-ink">{currentPage}</p>
                <p className="truncate text-xs text-ink-subtle">{title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-ink-subtle sm:inline">
                {new Intl.DateTimeFormat('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }).format(new Date())}
              </span>
              <ThemeToggle className="md:hidden" />
              <button type="button" onClick={onLogout} className="btn-ghost btn-sm md:hidden">
                Sair
              </button>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
          <div className="page-shell-wide">{children}</div>
        </main>
      </div>
    </div>
  );
}
