'use client';

import { AppShell } from '@/components/AppShell';
import { useSession } from '@/lib/useSession';
import { Spinner } from '@/components/ui';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/clientes', label: 'Clientes' },
  { href: '/admin/emprestimos', label: 'Empréstimos' },
  { href: '/admin/relatorios', label: 'Relatórios' },
  { href: '/admin/cobranca', label: 'Cobrança' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useSession(['ADMIN', 'ANALISTA']);
  if (loading || !user) return <Spinner />;
  return (
    <AppShell title="Painel Administrativo" nav={NAV} userName={user.nome} onLogout={logout}>
      {children}
    </AppShell>
  );
}
