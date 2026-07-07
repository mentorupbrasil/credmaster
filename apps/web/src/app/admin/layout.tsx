'use client';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Wallet,
  CreditCard,
  PhoneCall,
  BarChart3,
  Settings,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useSession } from '@/lib/useSession';
import { PageSkeleton } from '@/components/ui';
import { api } from '@/lib/api';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, section: 'Visão geral' },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/emprestimos', label: 'Empréstimos', icon: Wallet, section: 'Operação' },
  { href: '/admin/recebimentos', label: 'Recebimentos', icon: CreditCard },
  { href: '/admin/cobranca', label: 'Cobrança', icon: PhoneCall },
  { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart3, section: 'Análise' },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings, section: 'Sistema' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useSession(['ADMIN', 'ANALISTA']);
  const [brandName, setBrandName] = useState('CredMaster');

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    api
      .get<{ nomeSistema: string }>('/parametros/config')
      .then((c) => c.nomeSistema && setBrandName(c.nomeSistema))
      .catch(() => undefined);
  }, [user?.role]);

  if (loading || !user) return <PageSkeleton />;
  return (
    <AppShell
      brandName={brandName}
      title="Painel Administrativo"
      nav={NAV}
      userName={user.nome}
      onLogout={logout}
    >
      {children}
    </AppShell>
  );
}
