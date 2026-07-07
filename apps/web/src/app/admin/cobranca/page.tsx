'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import {
  DataTable,
  PageHeader,
  Spinner,
  ErrorBox,
  StatusBadge,
  EmptyState,
  MetricCard,
} from '@/components/ui';
import { useFeedback } from '@/components/feedback';

interface Atrasado {
  emprestimoId: string;
  numeroContrato: string;
  clienteNome: string;
  saldoRestante: string;
  diasAtraso: number;
  dataVencimento: string;
  whatsappLink: string;
  valorEmprestado: string;
}

export default function CobrancaPage() {
  const { toast, confirm, prompt } = useFeedback();
  const [lista, setLista] = useState<Atrasado[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<Atrasado[]>('/cobranca/atrasados');
      setLista(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function registrarPagamento(item: Atrasado) {
    setProcessando(item.emprestimoId);
    try {
      const emp = await api.get<any>(`/emprestimos/${item.emprestimoId}`);
      const parcela = emp.parcelas?.find(
        (p: any) => p.status !== 'PAGA' && p.status !== 'CANCELADA',
      );
      if (!parcela) {
        toast('Nenhuma parcela em aberto.', 'error');
        return;
      }
      const emAberto = (
        Number(parcela.valorParcela) +
        Number(parcela.multa) +
        Number(parcela.jurosMora) -
        Number(parcela.valorPago)
      ).toFixed(2);

      const valorStr = await prompt({
        titulo: `Pagamento — ${item.clienteNome}`,
        mensagem: `Saldo em aberto: ${brl(item.saldoRestante)}`,
        valorInicial: emAberto,
        obrigatorio: true,
        confirmar: 'Registrar',
      });
      if (!valorStr) return;

      await api.post(`/emprestimos/${item.emprestimoId}/pagamentos`, {
        parcelaId: parcela.id,
        valor: Number(valorStr.replace(',', '.')),
        forma: 'PIX',
      });
      toast('Pagamento registrado.', 'success');
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    } finally {
      setProcessando(null);
    }
  }

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

  const totalAtraso = lista.reduce((acc, i) => acc + Number(i.saldoRestante), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cobrança"
        subtitle="Contratos em atraso e ações de recuperação"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Contratos em atraso" value={lista.length} accent="red" icon="⚠️" />
        <MetricCard label="Total em atraso" value={brl(totalAtraso)} accent="red" icon="💸" />
        <MetricCard
          label="Média de dias"
          value={
            lista.length
              ? Math.round(lista.reduce((a, i) => a + i.diasAtraso, 0) / lista.length)
              : 0
          }
          icon="📅"
        />
      </div>

      {erro && <ErrorBox message={erro} />}

      {loading ? (
        <Spinner />
      ) : lista.length === 0 ? (
        <EmptyState
          title="Nenhum contrato em atraso"
          description="Sua carteira está em dia."
          icon="✅"
        />
      ) : (
        <DataTable
          columns={[
            { key: 'cliente', label: 'Cliente' },
            { key: 'contrato', label: 'Contrato' },
            { key: 'vencimento', label: 'Vencimento' },
            { key: 'dias', label: 'Dias' },
            { key: 'saldo', label: 'Saldo', align: 'right' },
            { key: 'acoes', label: 'Ações', align: 'right' },
          ]}
        >
          {lista.map((item) => (
            <tr key={item.emprestimoId}>
              <td className="font-medium">{item.clienteNome}</td>
              <td>
                <Link
                  href={`/admin/emprestimos/${item.emprestimoId}`}
                  className="text-primary hover:underline"
                >
                  {item.numeroContrato}
                </Link>
              </td>
              <td>{dataBR(item.dataVencimento)}</td>
              <td>
                <StatusBadge status="EM_ATRASO" />
                <span className="ml-1 text-xs text-slate-500">{item.diasAtraso}d</span>
              </td>
              <td className="text-right font-semibold text-danger">
                {brl(item.saldoRestante)}
              </td>
              <td className="text-right">
                <div className="flex justify-end gap-1">
                  <a
                    href={item.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost !px-2 !py-1.5 !text-xs"
                    title="WhatsApp"
                  >
                    💬
                  </a>
                  <button
                    className="btn-primary !px-2 !py-1.5 !text-xs"
                    disabled={processando === item.emprestimoId}
                    onClick={() => registrarPagamento(item)}
                  >
                    Pagar
                  </button>
                  <button
                    className="btn-success !px-2 !py-1.5 !text-xs"
                    disabled={processando === item.emprestimoId}
                    onClick={() => liquidar(item)}
                  >
                    Liquidar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
