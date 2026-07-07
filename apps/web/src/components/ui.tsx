'use client';

import React from 'react';
import { statusLabel, statusVariant } from '@/lib/format';

export function MetricCard({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: 'default' | 'green' | 'red' | 'amber' | 'blue';
  icon?: React.ReactNode;
}) {
  const color =
    accent === 'green'
      ? 'text-success'
      : accent === 'red'
        ? 'text-danger'
        : accent === 'amber'
          ? 'text-warning'
          : accent === 'blue'
            ? 'text-primary'
            : 'text-slate-900';

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between gap-2">
        <p className="metric-card-label">{label}</p>
        {icon && <span className="text-lg opacity-70">{icon}</span>}
      </div>
      <p className={`metric-card-value ${color}`}>{value}</p>
      {hint && <p className="metric-card-hint">{hint}</p>}
    </div>
  );
}

/** @deprecated Use MetricCard */
export const Stat = MetricCard;

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = '📭',
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card-premium flex flex-col items-center justify-center py-12 text-center">
      <span className="mb-3 text-4xl">{icon}</span>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
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
  return <span className={cls}>{statusLabel(status)}</span>;
}

/** @deprecated Use StatusBadge */
export function Badge({ status }: { status: string }) {
  return <StatusBadge status={status} />;
}

export function DataTable({
  columns,
  children,
  empty,
}: {
  columns: { key: string; label: string; align?: 'left' | 'right' }[];
  children: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const isEmpty = React.Children.count(children) === 0;
  return (
    <div className="card-premium overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="table-premium">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.align === 'right' ? 'text-right' : ''}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={columns.length} className="py-10 text-center text-slate-400">
                  {empty ?? 'Nenhum registro encontrado.'}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="mt-3 text-sm text-slate-400">{label}</p>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">
      {message}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card-premium">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function SimpleBarChart({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="bar-chart">
      {items.map((item) => (
        <div key={item.label} className="bar-chart-item">
          <div
            className="bar-chart-bar"
            style={{
              height: `${Math.max(8, (item.value / max) * 100)}%`,
              backgroundColor: item.color,
            }}
            title={`${item.label}: ${item.value}`}
          />
          <span className="text-center text-xs font-medium text-slate-600">{item.label}</span>
          <span className="text-xs text-slate-400">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Modal({
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
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
