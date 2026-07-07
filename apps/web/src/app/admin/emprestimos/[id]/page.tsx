'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  CheckCircle2,
  CreditCard,
  ArrowLeft,
  Ban,
} from 'lucide-react';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import { whatsappLink, mensagemCobranca } from '@/lib/finance-ui';
import {
  MetricCard,
  PageHeader,
  PageSkeleton,
  ErrorBox,
  StatusBadge,
  DataTable,
  SectionCard,
  EmptyState,
  InfoGrid,
} from '@/components/ui';
import { PaymentModal } from '@/components/PaymentModal';
import { useFeedback } from '@/components/feedback';

export default function EmprestimoDetalhe({ params }: { params: { id: string } }) {
  const [emp, setEmp] = useState<any>(null);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const { toast, confirm } = useFeedback();

  const carregar = useCallback(async () => {
    try {
      const e = await api.get<any>(`/emprestimos/${params.id}`);
      setEmp(e);
      const pg = await api.get<any[]>(`/emprestimos/${params.id}/pagamentos`);
      setPagamentos(pg);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro');
    }
  }, [params.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function quitar() {
    try {
      const prev = await api.get<any>(`/emprestimos/${params.id}/quitacao`);
      const ok = await confirm({
        titulo: 'Liquidar contrato',
        mensagem: `Valor de quitação hoje: ${brl(prev.valorQuitacao)}. Confirmar liquidação total?`,
        confirmar: 'Liquidar',
      });
      if (!ok) return;
      setAcao(true);
      await api.post(`/emprestimos/${params.id}/quitar`, { forma: 'PIX' });
      toast('Contrato liquidado.', 'success');
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao liquidar', 'error');
    } finally {
      setAcao(false);
    }
  }

  async function cancelar() {
    const ok = await confirm({
      titulo: 'Cancelar contrato',
      mensagem: 'Deseja cancelar este contrato? Esta ação é irreversível.',
      confirmar: 'Cancelar contrato',
      perigo: true,
    });
    if (!ok) return;
    setAcao(true);
    try {
      await api.post(`/emprestimos/${params.id}/cancelar`, { motivo: 'Cancelado pelo administrador' });
      toast('Contrato cancelado.', 'success');
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    } finally {
      setAcao(false);
    }
  }

  if (erro) return <ErrorBox message={erro} onRetry={carregar} />;
  if (!emp) return <PageSkeleton />;

  const r = emp.resumo ?? {};
  const diasAtraso = r.diasAtraso ?? 0;
  const tel = emp.cliente?.telefone;
  const wa = tel
    ? whatsappLink(
        tel,
        mensagemCobranca(emp.cliente?.nome, r.saldoDevedor ?? emp.saldoDevedor, dataBR(emp.dataFinal)),
      )
    : null;
  const ativo = ['ATIVO', 'EM_ATRASO', 'VENCENDO_HOJE', 'INADIMPLENTE'].includes(emp.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={emp.numeroContrato}
        subtitle={
          <>
            Cliente:{' '}
            <Link href={`/admin/clientes/${emp.cliente?.id}`} className="text-primary hover:underline">
              {emp.cliente?.nome}
            </Link>
          </>
        }
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Empréstimos', href: '/admin/emprestimos' },
          { label: emp.numeroContrato },
        ]}
        badge={<StatusBadge status={emp.status} />}
        actions={
          <>
            <Link href="/admin/emprestimos" className="btn-ghost btn-sm">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
            {wa && ativo && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-success btn-sm">
                <MessageCircle className="h-4 w-4" /> Cobrar
              </a>
            )}
            {ativo && (
              <>
                <button type="button" className="btn-primary btn-sm" onClick={() => setPayOpen(true)}>
                  <CreditCard className="h-4 w-4" /> Registrar pagamento
                </button>
                <button type="button" className="btn-success btn-sm" onClick={quitar} disabled={acao}>
                  <CheckCircle2 className="h-4 w-4" /> Liquidar
                </button>
                <button type="button" className="btn-danger btn-sm" onClick={cancelar} disabled={acao}>
                  <Ban className="h-4 w-4" /> Cancelar
                </button>
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Valor emprestado" value={brl(emp.valorPrincipal)} accent="blue" />
        <MetricCard label="Juros do contrato" value={brl(emp.totalJuros ?? 0)} accent="green" />
        <MetricCard label="Total original" value={brl(emp.totalAPagar)} />
        <MetricCard label="Saldo atualizado" value={brl(r.saldoDevedor ?? emp.saldoDevedor)} />
        <MetricCard label="Vencimento" value={dataBR(emp.dataFinal)} accent={emp.status === 'VENCENDO_HOJE' ? 'amber' : 'default'} />
        <MetricCard label="Dias em atraso" value={diasAtraso} accent={diasAtraso > 0 ? 'red' : 'default'} />
        <MetricCard label="Multa acumulada" value={brl(r.encargosAcumulados ?? 0)} accent="amber" />
        <MetricCard label="Taxa de juros" value={`${emp.taxaJurosPercent ?? emp.taxaJurosMes ?? '—'}%`} />
      </div>

      <SectionCard title="Resumo do contrato">
        <InfoGrid
          items={[
            { label: 'Nº contrato', value: emp.numeroContrato },
            { label: 'Data contratação', value: dataBR(emp.dataContratacao ?? emp.createdAt) },
            { label: 'Prazo (dias)', value: emp.prazoDias ?? '—' },
            { label: 'Multa diária', value: brl(emp.multaDiariaFixa ?? 10) },
            { label: 'Próximo vencimento', value: dataBR(r.proximoVencimento ?? emp.dataFinal) },
            { label: 'Valor próxima parcela', value: brl(r.valorProximaParcela ?? emp.totalAPagar) },
          ]}
        />
        {emp.observacoes && (
          <div className="mt-4 rounded-xl border border-border bg-slate-50/80 p-4">
            <p className="text-[11px] font-semibold uppercase text-slate-400">Observações</p>
            <p className="mt-1 text-sm text-slate-700">{emp.observacoes}</p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Cronograma de parcelas" noPadding>
        {!emp.parcelas?.length ? (
          <EmptyState title="Sem parcelas" />
        ) : (
          <DataTable
            columns={[
              { key: 'num', label: '#' },
              { key: 'venc', label: 'Vencimento' },
              { key: 'parcela', label: 'Parcela' },
              { key: 'encargos', label: 'Encargos' },
              { key: 'pago', label: 'Pago' },
              { key: 'status', label: 'Status' },
            ]}
          >
            {emp.parcelas.map((p: any) => (
              <tr key={p.id}>
                <td>{p.numero}</td>
                <td>{dataBR(p.vencimento)}</td>
                <td className="font-semibold">{brl(p.valorParcela)}</td>
                <td className="text-warning">{brl(Number(p.multa) + Number(p.jurosMora))}</td>
                <td>{brl(p.valorPago)}</td>
                <td><StatusBadge status={p.status} size="sm" /></td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      <SectionCard title="Histórico de pagamentos" noPadding>
        {pagamentos.length === 0 ? (
          <EmptyState
            title="Nenhum pagamento"
            description="Registre o primeiro recebimento deste contrato."
            action={
              ativo ? (
                <button type="button" className="btn-primary" onClick={() => setPayOpen(true)}>
                  Registrar pagamento
                </button>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            columns={[
              { key: 'data', label: 'Data' },
              { key: 'valor', label: 'Valor', align: 'right' },
              { key: 'forma', label: 'Forma' },
              { key: 'status', label: 'Status' },
            ]}
          >
            {pagamentos.map((p) => (
              <tr key={p.id}>
                <td>{dataBR(p.dataPagamento)}</td>
                <td className="text-right font-semibold text-success">{brl(p.valor)}</td>
                <td>{p.forma}</td>
                <td><StatusBadge status={p.status} size="sm" /></td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        preselectedEmprestimoId={params.id}
        onSuccess={carregar}
      />
    </div>
  );
}
