'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import {
  calcValorEmAberto,
  findParcelaAberta,
  FORMAS_PAGAMENTO,
  type ParcelaAberta,
} from '@/lib/finance-ui';
import { FormField, Modal, StatusBadge } from '@/components/ui';
import { useFeedback } from '@/components/feedback';

interface EmprestimoOption {
  id: string;
  numeroContrato: string;
  cliente?: { nome: string };
}

interface EmprestimoDetalhe {
  id: string;
  numeroContrato: string;
  status: string;
  cliente?: { id: string; nome: string; telefone?: string };
  resumo?: {
    saldoDevedor?: number | string;
    diasAtraso?: number;
    encargosAcumulados?: number | string;
  };
  parcelas?: ParcelaAberta[];
}

export function PaymentModal({
  open,
  onClose,
  onSuccess,
  preselectedEmprestimoId,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedEmprestimoId?: string;
}) {
  const { toast } = useFeedback();
  const [emprestimos, setEmprestimos] = useState<EmprestimoOption[]>([]);
  const [emprestimoId, setEmprestimoId] = useState('');
  const [detalhe, setDetalhe] = useState<EmprestimoDetalhe | null>(null);
  const [parcelaId, setParcelaId] = useState('');
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState('PIX');
  const [dataPagamento, setDataPagamento] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmprestimoId(preselectedEmprestimoId ?? '');
    setDetalhe(null);
    setParcelaId('');
    setValor('');
    setForma('PIX');
    setDataPagamento(new Date().toISOString().slice(0, 10));
    setObservacao('');

    Promise.all([
      api.get<{ data: EmprestimoOption[] }>('/emprestimos?status=ATIVO&pageSize=100'),
      api.get<{ data: EmprestimoOption[] }>('/emprestimos?status=EM_ATRASO&pageSize=100'),
      api.get<{ data: EmprestimoOption[] }>('/emprestimos?status=VENCENDO_HOJE&pageSize=100'),
    ])
      .then(([a, b, c]) => setEmprestimos([...a.data, ...b.data, ...c.data]))
      .catch(() => setEmprestimos([]));
  }, [open, preselectedEmprestimoId]);

  useEffect(() => {
    if (!open || !preselectedEmprestimoId) return;
    void selecionarEmprestimo(preselectedEmprestimoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectedEmprestimoId]);

  async function selecionarEmprestimo(id: string) {
    setEmprestimoId(id);
    setDetalhe(null);
    setParcelaId('');
    setValor('');
    if (!id) return;

    setCarregando(true);
    try {
      const emp = await api.get<EmprestimoDetalhe>(`/emprestimos/${id}`);
      setDetalhe(emp);
      const parcela = findParcelaAberta(emp.parcelas);
      if (parcela) {
        setParcelaId(parcela.id);
        setValor(calcValorEmAberto(parcela).toFixed(2));
      }
    } catch {
      toast('Erro ao carregar contrato.', 'error');
    } finally {
      setCarregando(false);
    }
  }

  async function registrar() {
    if (!emprestimoId || !parcelaId || !valor) {
      toast('Preencha contrato e valor.', 'error');
      return;
    }
    const v = Number(valor);
    if (!Number.isFinite(v) || v <= 0) {
      toast('Valor inválido.', 'error');
      return;
    }

    setSalvando(true);
    try {
      await api.post(`/emprestimos/${emprestimoId}/pagamentos`, {
        parcelaId,
        valor: v,
        forma,
        dataPagamento: dataPagamento || undefined,
        observacao: observacao || undefined,
      });
      toast('Pagamento registrado com sucesso.', 'success');
      onClose();
      onSuccess?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao registrar', 'error');
    } finally {
      setSalvando(false);
    }
  }

  const parcela = detalhe?.parcelas?.find((p) => p.id === parcelaId);
  const emAberto = parcela ? calcValorEmAberto(parcela) : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar pagamento"
      description="Informe o contrato e o valor recebido. Pagamentos parciais são permitidos."
      size="lg"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={registrar} disabled={salvando || carregando}>
            {salvando ? 'Registrando…' : 'Confirmar pagamento'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Contrato">
          <select
            className="select"
            value={emprestimoId}
            onChange={(e) => selecionarEmprestimo(e.target.value)}
            disabled={!!preselectedEmprestimoId}
          >
            <option value="">Selecione um contrato…</option>
            {emprestimos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.numeroContrato} — {e.cliente?.nome}
              </option>
            ))}
          </select>
        </FormField>

        {carregando && <p className="text-sm text-slate-400">Carregando contrato…</p>}

        {detalhe && (
          <div className="rounded-xl border border-border bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">{detalhe.cliente?.nome}</p>
                <p className="text-xs text-slate-500">{detalhe.numeroContrato}</p>
              </div>
              <StatusBadge status={detalhe.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase text-slate-400">Saldo atual</p>
                <p className="font-semibold text-slate-900">{brl(detalhe.resumo?.saldoDevedor)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-slate-400">Dias atraso</p>
                <p className="font-semibold text-slate-900">{detalhe.resumo?.diasAtraso ?? 0}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-slate-400">Multa acumulada</p>
                <p className="font-semibold text-warning">{brl(detalhe.resumo?.encargosAcumulados ?? 0)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-slate-400">Em aberto (parcela)</p>
                <p className="font-semibold text-primary">{brl(emAberto)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Valor pago (R$)" hint="Aceita pagamento parcial ou total">
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </FormField>
          <FormField label="Forma de pagamento">
            <select className="select" value={forma} onChange={(e) => setForma(e.target.value)}>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Data do pagamento">
            <input
              className="input"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
            />
          </FormField>
          <FormField label="Observação">
            <input
              className="input"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Opcional"
            />
          </FormField>
        </div>
      </div>
    </Modal>
  );
}
