'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export function AppShell({
  title,
  nav,
  userName,
  onLogout,
  children,
}: {
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

  const navContent = (
    <>
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">
            C
          </span>
          <div>
            <p className="text-lg font-bold text-white">CredMaster</p>
            <p className="text-xs text-slate-400">{title}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={active ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <span className="text-base" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 border-t border-white/10 pt-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/80 text-sm font-semibold text-white">
            {userName?.charAt(0)?.toUpperCase() ?? 'U'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{userName ?? 'Usuário'}</p>
            <p className="text-xs text-slate-400">Administrador</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="sidebar-link w-full text-left"
        >
          <span aria-hidden>🚪</span>
          Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col bg-sidebar p-4 text-white md:flex">
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar p-4 text-white transition-transform md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              ☰
            </button>
            <p className="text-sm font-medium text-slate-600">{title}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">
              {userName}
            </span>
            <button onClick={onLogout} className="btn-ghost !py-1.5 md:hidden">
              Sair
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <div className="page-shell">{children}</div>
        </main>
      </div>
    </div>
  );
}
