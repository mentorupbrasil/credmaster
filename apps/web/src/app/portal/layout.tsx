'use client';

import { Bell, Wallet } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useSession } from '@/lib/useSession';
import { Spinner } from '@/components/ui';

const NAV = [
  { href: '/portal', label: 'Meus empréstimos', icon: Wallet },
  { href: '/portal/notificacoes', label: 'Notificações', icon: Bell },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useSession('CLIENTE');
  if (loading || !user) return <Spinner />;
  return (
    <AppShell title="Portal do Cliente" homeHref="/portal" nav={NAV} userName={user.nome} onLogout={logout}>
      {children}
    </AppShell>
  );
}
