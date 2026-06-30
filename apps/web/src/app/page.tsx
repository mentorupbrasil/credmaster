'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { tokenStore } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const u = tokenStore.user;
    if (!u) router.replace('/login');
    else router.replace(u.role === 'CLIENTE' ? '/portal' : '/admin');
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-slate-500">Carregando…</p>
    </main>
  );
}
