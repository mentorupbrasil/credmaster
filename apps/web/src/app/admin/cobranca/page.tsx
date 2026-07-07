'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, MessageCircle, CreditCard, CheckCircle2, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import { tierAtraso } from '@/lib/finance-ui';
import {
  DataTable,
  PageHeader,
  PageSkeleton,
  ErrorBox,
  EmptyState,
  MetricCard,
  DelayTierBadge,
  Tabs,
  HeroMetric,
} from '@/components/ui';
import { PaymentModal } from '@/components/PaymentModal';
import { useFeedback } from '@/components/feedback';

interface Atrasado {
  emprestimoId: string;
  numeroContrato: string;
  clienteNome: string;
  saldoRestante: string;
  diasAtraso: number;
  dataVencimento: string;
  whatsappLink: string;
  mensagemWhatsapp?: string;
  valorEmprestado: string;
  encargoAtraso: string;
  valorTotalOriginal: string;
}

export default function CobrancaPage() {
  const { toast, confirm } = useFeedback();
  const [lista, setLista] = useState<Atrasado[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState('todos');
  const [payOpen, setPayOpen] = useState(false);
  const [payEmprestimoId, setPayEmprestimoId] = useState<string | undefined>();
  const [processando, setProcessando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<Atrasado[]>('/cobranca/atrasados');
      setLista(r);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtered = useMemo(() => {
    if (tier === 'todos') return lista;
    return lista.filter((i) => tierAtraso(i.diasAtraso) === tier);
  }, [lista, tier]);

  const totalAtraso = filtered.reduce((acc, i) => acc + Number(i.saldoRestante), 0);
  const mediaDias = filtered.length
    ? Math.round(filtered.reduce((a, i) => a + i.diasAtraso, 0) / filtered.length)
    : 0;
  const maiorAtraso = filtered.reduce((m, i) => Math.max(m, i.diasAtraso), 0);

  async function liquidar(item: Atrasado) {
    const ok = await confirm({
      titulo: 'Liquidar contrato',
      mensagem: `Confirmar liquidação de ${item.clienteNome}? Saldo: ${brl(item.saldoRestante)}`,
      confirmar: 'Liquidar',
    });
    if (!ok) return;
    setProcessando(item.emprestimoId);
    try {
      await api.post(`/emprestimos/${item.emprestimoId}/quitar`, { forma: 'PIX' });
      toast('Contrato liquidado.', 'success');
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao liquidar', 'error');
    } finally {
      setProcessando(null);
    }
  }

  const tierTabs = [
    { key: 'todos', label: 'Todos', count: lista.length },
    { key: 'leve', label: 'Leve (≤7d)', count: lista.filter((i) => tierAtraso(i.diasAtraso) === 'leve').length },
    { key: 'moderado', label: 'Moderado', count: lista.filter((i) => tierAtraso(i.diasAtraso) === 'moderado').length },
    { key: 'critico', label: 'Crítico', count: lista.filter((i) => tierAtraso(i.diasAtraso) === 'critico').length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cobrança"
        subtitle="Painel estratégico de recuperação e inadimplência"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Cobrança' }]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <HeroMetric
          label="Total em atraso"
          value={brl(totalAtraso)}
          hint={`${filtered.length} contrato(s) na faixa selecionada`}
          icon={AlertTriangle}
          accent="red"
        />
        <MetricCard label="Contratos em atraso" value={lista.length} accent="red" />
        <MetricCard label="Média de dias" value={mediaDias} />
        <MetricCard label="Maior atraso" value={`${maiorAtraso} dias`} accent={maiorAtraso > 30 ? 'red' : 'amber'} />
      </div>

      <Tabs tabs={tierTabs} active={tier} onChange={setTier} />

      {erro && <ErrorBox message={erro} onRetry={carregar} />}

      {loading ? (
        <PageSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum contrato nesta faixa"
          description="Sua carteira está em dia ou não há inadimplência neste segmento."
        />
      ) : (
        <DataTable
          columns={[
            { key: 'cliente', label: 'Cliente' },
            { key: 'contrato', label: 'Contrato' },
            { key: 'venc', label: 'Vencimento' },
            { key: 'atraso', label: 'Atraso' },
            { key: 'original', label: 'Original' },
            { key: 'multa', label: 'Multa' },
            { key: 'atualizado', label: 'Atualizado', align: 'right' },
            { key: 'acoes', label: '', align: 'right' },
          ]}
        >
          {filtered.map((item) => (
            <tr key={item.emprestimoId}>
              <td>
                <p className="font-semibold text-slate-900">{item.clienteNome}</p>
              </td>
              <td>
                <Link href={`/admin/emprestimos/${item.emprestimoId}`} className="font-medium text-primary hover:underline">
                  {item.numeroContrato}
                </Link>
              </td>
              <td>{dataBR(item.dataVencimento)}</td>
              <td><DelayTierBadge dias={item.diasAtraso} /></td>
              <td>{brl(item.valorTotalOriginal ?? item.valorEmprestado)}</td>
              <td className="text-warning">{brl(item.encargoAtraso ?? 0)}</td>
              <td className="text-right font-bold text-danger">{brl(item.saldoRestante)}</td>
              <td className="text-right">
                <div className="flex justify-end gap-1">
                  <a
                    href={item.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-icon"
                    title="WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4 text-success" />
                  </a>
                  <Link href={`/admin/emprestimos/${item.emprestimoId}`} className="btn-icon" title="Ver contrato">
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={processando === item.emprestimoId}
                    onClick={() => {
                      setPayEmprestimoId(item.emprestimoId);
                      setPayOpen(true);
                    }}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="btn-success btn-sm"
                    disabled={processando === item.emprestimoId}
                    onClick={() => liquidar(item)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <PaymentModal
        open={payOpen}
        onClose={() => {
          setPayOpen(false);
          setPayEmprestimoId(undefined);
        }}
        preselectedEmprestimoId={payEmprestimoId}
        onSuccess={carregar}
      />
    </div>
  );
}
