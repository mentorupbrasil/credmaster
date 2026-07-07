export function brl(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(n) ? n : 0);
}

export function percent(fraction: number | string | null | undefined): string {
  const n = typeof fraction === 'string' ? Number(fraction) : (fraction ?? 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number.isFinite(n) ? n : 0);
}

export function dataBR(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(d);
}

export function cpfMask(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function phoneMask(phone: string | null | undefined): string {
  if (!phone) return '-';
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return phone;
}

const STATUS_LABELS: Record<string, string> = {
  ATIVO: 'Ativo',
  APROVADO: 'Aprovado',
  PAGA: 'Paga',
  LIQUIDADO: 'Liquidado',
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em análise',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  PARCIAL: 'Parcial',
  VENCIDA: 'Vencida',
  EM_ATRASO: 'Em atraso',
  VENCENDO_HOJE: 'Vencendo hoje',
  INADIMPLENTE: 'Inadimplente',
  REPROVADO: 'Reprovado',
  BLOQUEADO: 'Bloqueado',
  CANCELADA: 'Cancelada',
  CANCELADO: 'Cancelado',
  QUITADO: 'Quitado',
  CONFIRMADO: 'Confirmado',
  ESTORNADO: 'Estornado',
  CONCLUIDO: 'Concluído',
  EXECUTANDO: 'Executando',
  FALHA: 'Falha',
};

const STATUS_VARIANTS: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
  ATIVO: 'success',
  APROVADO: 'success',
  PAGA: 'success',
  LIQUIDADO: 'success',
  CONFIRMADO: 'success',
  CONCLUIDO: 'success',
  QUITADO: 'success',
  PENDENTE: 'neutral',
  EM_ANALISE: 'warning',
  AGUARDANDO_APROVACAO: 'warning',
  PARCIAL: 'warning',
  VENCENDO_HOJE: 'warning',
  EXECUTANDO: 'warning',
  VENCIDA: 'danger',
  EM_ATRASO: 'danger',
  INADIMPLENTE: 'danger',
  REPROVADO: 'danger',
  BLOQUEADO: 'danger',
  FALHA: 'danger',
  ESTORNADO: 'danger',
  CANCELADA: 'neutral',
  CANCELADO: 'neutral',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function statusVariant(
  status: string,
): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  return STATUS_VARIANTS[status] ?? 'neutral';
}
