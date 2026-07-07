'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { statusLabel, statusVariant } from '@/lib/format';

/* ─── MetricCard ─── */
export function MetricCard({
  label,
  value,
  hint,
  accent = 'default',
  icon: Icon,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: 'default' | 'green' | 'red' | 'amber' | 'blue';
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
}) {
  const accentCls =
    accent === 'green'
      ? 'metric-card-accent-green'
      : accent === 'red'
        ? 'metric-card-accent-red'
        : accent === 'amber'
          ? 'metric-card-accent-amber'
          : accent === 'blue'
            ? 'metric-card-accent-blue'
            : '';

  const iconCls =
    accent === 'green'
      ? 'metric-card-icon-green'
      : accent === 'red'
        ? 'metric-card-icon-red'
        : accent === 'amber'
          ? 'metric-card-icon-amber'
          : accent === 'blue'
            ? 'metric-card-icon-blue'
            : 'metric-card-icon';

  const valueColor =
    accent === 'green'
      ? 'text-success'
      : accent === 'red'
        ? 'text-danger'
        : accent === 'amber'
          ? 'text-warning'
          : accent === 'blue'
            ? 'text-accent-600'
            : 'text-ink';

  return (
    <div className={`metric-card ${accentCls}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="metric-card-label">{label}</p>
          <p className={`metric-card-value ${valueColor}`}>{value}</p>
          {hint && <p className="metric-card-hint">{hint}</p>}
          {trend && (
            <p
              className={`mt-1 text-xs font-medium ${trend.positive ? 'text-success' : 'text-danger'}`}
            >
              {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={iconCls}>
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
        )}
      </div>
    </div>
  );
}

export const Stat = MetricCard;

/* ─── PageHeader ─── */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-2 text-2xs font-medium uppercase tracking-wider text-ink-subtle">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-ink-faint">/</span>}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-accent-600">
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-ink-muted">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  badge,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-border-subtle pb-8 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-[2rem] sm:leading-tight">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

/* ─── KPI Section ─── */
export function KpiSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-label">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-subtle">{description}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

/* ─── EmptyState ─── */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-surface-muted to-white text-ink-subtle shadow-inner">
        {Icon ? <Icon className="h-7 w-7" strokeWidth={1.5} /> : <span className="text-xl">—</span>}
      </div>
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-subtle">{description}</p>
      )}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

/* ─── StatusBadge ─── */
export function StatusBadge({ status, size = 'default' }: { status: string; size?: 'sm' | 'default' }) {
  const variant = statusVariant(status);
  const cls =
    variant === 'success'
      ? 'badge-success'
      : variant === 'danger'
        ? 'badge-danger'
        : variant === 'warning'
          ? 'badge-warning'
          : variant === 'info'
            ? 'badge-info'
            : 'badge-neutral';
  return (
    <span className={`${cls} ${size === 'sm' ? '!px-2 !py-0 !text-[10px]' : ''}`}>
      {statusLabel(status)}
    </span>
  );
}

export const Badge = StatusBadge;

/* ─── DataTable ─── */
export function DataTable({
  columns,
  children,
  empty,
  footer,
}: {
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center'; className?: string }[];
  children: React.ReactNode;
  empty?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const isEmpty = React.Children.count(children) === 0;
  return (
    <div className="panel">
      <div className="overflow-x-auto">
        <table className="table-premium">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''} ${col.className ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={columns.length} className="!p-0">
                  {empty ?? (
                    <p className="py-12 text-center text-sm text-slate-400">Nenhum registro encontrado.</p>
                  )}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-border-subtle px-4 py-3">{footer}</div>}
    </div>
  );
}

/* ─── Loading ─── */
export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="mt-4 text-sm text-slate-400">{label}</p>
    </div>
  );
}

export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

/* ─── ErrorBox ─── */
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger-100 bg-danger-50 px-5 py-4">
      <p className="text-sm text-danger-700">{message}</p>
      {onRetry && (
        <button type="button" className="btn-ghost btn-sm" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

/* ─── SectionCard ─── */
export function SectionCard({
  title,
  description,
  action,
  children,
  noPadding,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
}) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className={noPadding ? 'panel-body' : 'panel-body-padded'}>{children}</div>
    </div>
  );
}

/* ─── FilterBar ─── */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="card-premium-padded flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      {children}
    </div>
  );
}

export function StatStrip({ items }: { items: { label: string; value: React.ReactNode; accent?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-border bg-surface-elevated px-4 py-3.5 shadow-xs transition-shadow hover:shadow-card"
        >
          <p className="text-label">{item.label}</p>
          <p className={`mt-1.5 font-display text-xl font-bold text-ink text-money ${item.accent ?? ''}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ─── Tabs ─── */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="tab-list">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={active === tab.key ? 'tab-item-active' : 'tab-item'}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── Pagination ─── */
export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
      <span>
        {total} registro{total !== 1 ? 's' : ''} · página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

/* ─── InfoGrid ─── */
export function InfoGrid({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Timeline ─── */
export function Timeline({
  items,
}: {
  items: { title: string; subtitle?: string; date: string; accent?: 'default' | 'green' | 'red' }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-0">
      {items.map((item, i) => (
        <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
          {i < items.length - 1 && (
            <div className="absolute left-[7px] top-4 h-full w-px bg-border" />
          )}
          <div
            className={`relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
              item.accent === 'green'
                ? 'border-success bg-success-50'
                : item.accent === 'red'
                  ? 'border-danger bg-danger-50'
                  : 'border-slate-300 bg-white'
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800">{item.title}</p>
            {item.subtitle && <p className="mt-0.5 text-xs text-slate-500">{item.subtitle}</p>}
            <p className="mt-1 text-[11px] text-slate-400">{item.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Modal ─── */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW =
    size === 'xl' ? 'max-w-3xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-ink/55 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${maxW} animate-slide-up rounded-2xl border border-border bg-surface-elevated shadow-card-hover`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border-subtle px-6 py-5">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border-subtle px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

/* ─── Drawer ─── */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-[120] flex w-full max-w-lg flex-col border-l border-border bg-white shadow-card-hover animate-slide-up">
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="border-t border-border-subtle px-6 py-4">{footer}</div>
        )}
      </aside>
    </>
  );
}

/* ─── Form helpers ─── */
export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative min-w-[220px] flex-1">
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        className="input-search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

/* ─── Delay tier badge ─── */
export function DelayTierBadge({ dias }: { dias: number }) {
  if (dias <= 7)
    return <span className="badge-warning">Leve · {dias}d</span>;
  if (dias <= 30)
    return <span className="badge-danger">Moderado · {dias}d</span>;
  return <span className="badge-danger bg-red-900/10 text-red-900">Crítico · {dias}d</span>;
}

/* ─── Charts ─── */
const CHART_COLORS = ['#6366F1', '#E11D48', '#059669', '#D97706', '#64748B'];

export function DonutChart({
  data,
  height = 220,
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
}) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
        Sem dados para exibir
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={filtered}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {filtered.map((entry, i) => (
            <Cell key={entry.name} fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => [v ?? 0, '']}
          contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 13 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ChartLegend({
  items,
}: {
  items: { name: string; value: number | string; color: string }[];
}) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.name}</span>
          <span className="font-semibold text-slate-800">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SimpleBarChart({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={items} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 13 }}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {items.map((item) => (
            <Cell key={item.label} fill={item.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FinanceBarChart({
  data,
  height = 240,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          formatter={(v) => [
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v ?? 0)),
            '',
          ]}
          contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 13 }}
        />
        <Bar dataKey="value" fill="#6366F1" radius={[10, 10, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Hero KPI (dashboard top) ─── */
export function HeroMetric({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'blue',
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  accent?: 'blue' | 'green' | 'red' | 'amber';
}) {
  const shell = {
    blue: 'hero-metric-blue',
    green: 'hero-metric-green',
    red: 'hero-metric-red',
    amber: 'hero-metric-amber',
  };
  const iconShell = {
    blue: 'bg-gradient-to-br from-accent-400 to-accent-700 shadow-glow-sm',
    green: 'bg-gradient-to-br from-emerald-400 to-success-700 shadow-xs',
    red: 'bg-gradient-to-br from-rose-400 to-danger-700 shadow-xs',
    amber: 'bg-gradient-to-br from-amber-400 to-warning-700 shadow-xs',
  };
  return (
    <div className={`hero-metric ${shell[accent]}`}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-accent/5 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-label">{label}</p>
          <p className="mt-3 font-display text-[2rem] font-bold leading-none tracking-tight text-ink text-money sm:text-[2.25rem]">
            {value}
          </p>
          {hint && <p className="mt-3 text-xs leading-relaxed text-ink-subtle">{hint}</p>}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white ${iconShell[accent]}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
