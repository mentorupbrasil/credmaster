'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionUser, tokenStore, api } from './api';

/** Hook de sessão: garante autenticação e (opcionalmente) papel exigido. */
export function useSession(requiredRole?: SessionUser['role'] | SessionUser['role'][]) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = tokenStore.user;
    if (!u || !tokenStore.access) {
      router.replace('/login');
      return;
    }
    if (requiredRole) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(u.role)) {
        router.replace(u.role === 'CLIENTE' ? '/portal' : '/admin');
        return;
      }
    }
    setUser(u);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    api.logout();
    router.replace('/login');
  };

  return { user, loading, logout };
}
