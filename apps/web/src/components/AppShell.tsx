'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
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
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 flex-col bg-brand-900 p-4 text-white md:flex">
        <div className="mb-8 px-2">
          <p className="text-xl font-bold">CredMaster</p>
          <p className="text-xs text-brand-100">{title}</p>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  active ? 'bg-white/15 font-semibold' : 'text-brand-100 hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={onLogout} className="mt-4 rounded-lg px-3 py-2 text-left text-sm text-brand-100 hover:bg-white/10">
          Sair
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <p className="text-sm text-slate-500">{title}</p>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">{userName}</span>
            <button onClick={onLogout} className="btn-ghost md:hidden">
              Sair
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
