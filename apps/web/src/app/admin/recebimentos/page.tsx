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
  Modal,
  EmptyState,
} from '@/components/ui';
import { useFeedback } from '@/components/feedback';

interface Pagamento {
  id: string;
  valor: string;
  dataPagamento: string;
  forma: string;
  emprestimoId: string;
  emprestimo: {
    numeroContrato: string;
    cliente: { id: string; nome: string };
  };
}

export default function RecebimentosPage() {
  const { toast } = useFeedback();
  const [lista, setLista] = useState<Pagamento[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [emprestimos, setEmprestimos] = useState<any[]>([]);
  const [emprestimoId, setEmprestimoId] = useState('');
  const [parcelaId, setParcelaId] = useState('');
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState('PIX');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<{ data: Pagamento[] }>('/pagamentos?pageSize=50');
      setLista(r.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function abrirModal() {
    setModalOpen(true);
    setEmprestimoId('');
    setParcelaId('');
    setValor('');
    try {
      const r = await api.get<any>('/emprestimos?status=ATIVO&pageSize=100');
      const r2 = await api.get<any>('/emprestimos?status=EM_ATRASO&pageSize=100');
      setEmprestimos([...r.data, ...r2.data]);
    } catch {
      setEmprestimos([]);
    }
  }

  async function selecionarEmprestimo(id: string) {
    setEmprestimoId(id);
    setParcelaId('');
    setValor('');
    if (!id) return;
    try {
      const emp = await api.get<any>(`/emprestimos/${id}`);
      const parcela = emp.parcelas?.find(
        (p: any) => p.status !== 'PAGA' && p.status !== 'CANCELADA',
      );
      if (parcela) {
        setParcelaId(parcela.id);
        const emAberto =
          Number(parcela.valorParcela) +
          Number(parcela.multa) +
          Number(parcela.jurosMora) -
          Number(parcela.valorPago);
        setValor(emAberto.toFixed(2));
      }
    } catch {
      toast('Erro ao carregar empréstimo', 'error');
    }
  }

  async function registrar() {
    if (!emprestimoId || !parcelaId || !valor) {
      toast('Preencha todos os campos.', 'error');
      return;
    }
    setSalvando(true);
    try {
      await api.post(`/emprestimos/${emprestimoId}/pagamentos`, {
        parcelaId,
        valor: Number(valor),
        forma,
      });
      toast('Pagamento registrado.', 'success');
      setModalOpen(false);
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao registrar', 'error');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recebimentos"
        subtitle="Histórico de pagamentos confirmados"
        actions={
          <button className="btn-primary" onClick={abrirModal}>
            + Registrar pagamento
          </button>
        }
      />

      {erro && <ErrorBox message={erro} />}

      {loading ? (
        <Spinner />
      ) : lista.length === 0 ? (
        <EmptyState
          title="Nenhum recebimento"
          description="Registre o primeiro pagamento de um empréstimo."
          action={
            <button className="btn-primary" onClick={abrirModal}>
              Registrar pagamento
            </button>
          }
        />
      ) : (
        <DataTable
          columns={[
            { key: 'data', label: 'Data' },
            { key: 'cliente', label: 'Cliente' },
            { key: 'contrato', label: 'Contrato' },
            { key: 'forma', label: 'Forma' },
            { key: 'valor', label: 'Valor', align: 'right' },
          ]}
        >
          {lista.map((p) => (
            <tr key={p.id}>
              <td>{dataBR(p.dataPagamento)}</td>
              <td>
                <Link
                  href={`/admin/clientes/${p.emprestimo.cliente.id}`}
                  className="text-primary hover:underline"
                >
                  {p.emprestimo.cliente.nome}
                </Link>
              </td>
              <td>
                <Link
                  href={`/admin/emprestimos/${p.emprestimoId}`}
                  className="font-medium text-primary hover:underline"
                >
                  {p.emprestimo.numeroContrato}
                </Link>
              </td>
              <td>{p.forma}</td>
              <td className="text-right font-semibold text-success">{brl(p.valor)}</td>
            </tr>
          ))}
        </DataTable>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar pagamento"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={registrar} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Registrar'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Empréstimo</label>
            <select
              className="select"
              value={emprestimoId}
              onChange={(e) => selecionarEmprestimo(e.target.value)}
            >
              <option value="">Selecione…</option>
              {emprestimos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.numeroContrato} — {e.cliente?.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Valor (R$)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Forma de pagamento</label>
            <select className="select" value={forma} onChange={(e) => setForma(e.target.value)}>
              <option value="PIX">PIX</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="TRANSFERENCIA">Transferência</option>
              <option value="BOLETO">Boleto</option>
              <option value="CARTAO">Cartão</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
