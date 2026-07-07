'use client';

import { AppShell } from '@/components/AppShell';
import { useSession } from '@/lib/useSession';
import { Spinner } from '@/components/ui';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/clientes', label: 'Clientes', icon: '👥' },
  { href: '/admin/emprestimos', label: 'Empréstimos', icon: '💰' },
  { href: '/admin/recebimentos', label: 'Recebimentos', icon: '💳' },
  { href: '/admin/cobranca', label: 'Cobrança', icon: '📞' },
  { href: '/admin/relatorios', label: 'Relatórios', icon: '📈' },
  { href: '/admin/configuracoes', label: 'Configurações', icon: '⚙️' },
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
