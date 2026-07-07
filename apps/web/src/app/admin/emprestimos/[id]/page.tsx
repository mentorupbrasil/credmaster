'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import {
  MetricCard,
  PageHeader,
  Spinner,
  ErrorBox,
  StatusBadge,
  DataTable,
  SectionCard,
  EmptyState,
} from '@/components/ui';
import { useFeedback } from '@/components/feedback';

export default function EmprestimoDetalhe({ params }: { params: { id: string } }) {
  const [emp, setEmp] = useState<any>(null);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState(false);
  const { toast, confirm, prompt } = useFeedback();

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

  async function pagar(parcela: any) {
    const emAberto = (
      Number(parcela.valorParcela) +
      Number(parcela.multa) +
      Number(parcela.jurosMora) -
      Number(parcela.valorPago)
    ).toFixed(2);
    const valorStr = await prompt({
      titulo: `Registrar pagamento — parcela ${parcela.numero}`,
      mensagem: `Valor em aberto: ${brl(emAberto)}`,
      placeholder: 'Valor (ex.: 250.00)',
      valorInicial: emAberto,
      obrigatorio: true,
      confirmar: 'Pagar',
    });
    if (!valorStr) return;
    const valor = Number(valorStr.replace(',', '.'));
    if (!Number.isFinite(valor) || valor <= 0) {
      toast('Valor inválido.', 'error');
      return;
    }
    try {
      await api.post(`/emprestimos/${params.id}/pagamentos`, {
        parcelaId: parcela.id,
        valor,
        forma: 'PIX',
      });
      toast('Pagamento registrado.', 'success');
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao registrar', 'error');
    }
  }

  async function quitar() {
    try {
      const prev = await api.get<any>(`/emprestimos/${params.id}/quitacao`);
      const ok = await confirm({
        titulo: 'Liquidar contrato',
        mensagem: `Valor de quitação hoje: ${brl(prev.valorQuitacao)}. Confirmar liquidação?`,
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

  if (erro) return <ErrorBox message={erro} />;
  if (!emp) return <Spinner />;

  const r = emp.resumo ?? {};
  const diasAtraso = r.diasAtraso ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={emp.numeroContrato}
        subtitle={emp.cliente?.nome}
        actions={
          <>
            <StatusBadge status={emp.status} />
            {['ATIVO', 'EM_ATRASO', 'VENCENDO_HOJE', 'INADIMPLENTE'].includes(emp.status) && (
              <button className="btn-success" onClick={quitar} disabled={acao}>
                {acao ? 'Processando…' : 'Liquidar'}
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Principal" value={brl(emp.valorPrincipal)} />
        <MetricCard label="Saldo devedor" value={brl(r.saldoDevedor ?? emp.saldoDevedor)} />
        <MetricCard label="Total a pagar" value={brl(emp.totalAPagar)} accent="blue" />
        <MetricCard
          label="Dias em atraso"
          value={diasAtraso}
          accent={diasAtraso > 0 ? 'red' : 'default'}
        />
        <MetricCard label="Encargos" value={brl(r.encargosAcumulados ?? 0)} accent="amber" />
        <MetricCard label="Próximo vencimento" value={dataBR(r.proximoVencimento ?? emp.dataFinal)} />
        <MetricCard label="Valor próxima parcela" value={brl(r.valorProximaParcela ?? emp.totalAPagar)} />
        <MetricCard label="Juros do contrato" value={brl(emp.totalJuros ?? 0)} accent="green" />
      </div>

      {emp.observacoes && (
        <div className="card-premium text-sm text-slate-600">
          <strong>Observações:</strong> {emp.observacoes}
        </div>
      )}

      <SectionCard title="Cronograma">
        {emp.parcelas?.length === 0 ? (
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
              { key: 'acao', label: '', align: 'right' },
            ]}
          >
            {emp.parcelas.map((p: any) => (
              <tr key={p.id}>
                <td>{p.numero}</td>
                <td>{dataBR(p.vencimento)}</td>
                <td className="font-medium">{brl(p.valorParcela)}</td>
                <td className="text-warning">
                  {brl(Number(p.multa) + Number(p.jurosMora))}
                </td>
                <td>{brl(p.valorPago)}</td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
                <td className="text-right">
                  {['ATIVO', 'EM_ATRASO', 'VENCENDO_HOJE'].includes(emp.status) &&
                    p.status !== 'PAGA' &&
                    p.status !== 'CANCELADA' && (
                      <button className="btn-primary !py-1.5 !text-xs" onClick={() => pagar(p)}>
                        Registrar
                      </button>
                    )}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      <SectionCard title="Histórico de pagamentos">
        {pagamentos.length === 0 ? (
          <EmptyState title="Nenhum pagamento registrado" />
        ) : (
          <DataTable
            columns={[
              { key: 'data', label: 'Data' },
              { key: 'valor', label: 'Valor' },
              { key: 'forma', label: 'Forma' },
              { key: 'status', label: 'Status' },
            ]}
          >
            {pagamentos.map((p) => (
              <tr key={p.id}>
                <td>{dataBR(p.dataPagamento)}</td>
                <td className="font-medium text-success">{brl(p.valor)}</td>
                <td>{p.forma}</td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>
    </div>
  );
}
