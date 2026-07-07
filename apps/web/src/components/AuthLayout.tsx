'use client';

import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { ThemeToggle } from '@/components/ThemeToggle';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="auth-shell relative">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="mb-8 text-center">
        <Link href="/login" className="inline-flex items-center gap-3">
          <BrandMark className="h-10 w-10" />
          <span className="font-display text-xl font-semibold text-ink">CredMaster</span>
        </Link>
        <p className="mt-2 text-sm text-ink-subtle">Gestão de empréstimos particulares</p>
      </div>

      <div className="auth-card">
        <div className="mb-6">
          <h1 className="font-display text-xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-subtle">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="mt-6 border-t border-border pt-5">{footer}</div>}
      </div>

      <p className="mt-8 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} CredMaster
      </p>
    </div>
  );
}
