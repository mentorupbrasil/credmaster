'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import {
  DataTable,
  PageHeader,
  PageSkeleton,
  ErrorBox,
  FilterBar,
  SearchInput,
  StatStrip,
  EmptyState,
  MetricCard,
} from '@/components/ui';
import { PaymentModal } from '@/components/PaymentModal';

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
  const [lista, setLista] = useState<Pagamento[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [forma, setForma] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<{ data: Pagamento[] }>('/pagamentos?pageSize=100');
      setLista(r.data);
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
    return lista.filter((p) => {
      if (forma && p.forma !== forma) return false;
      if (de && p.dataPagamento.slice(0, 10) < de) return false;
      if (ate && p.dataPagamento.slice(0, 10) > ate) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (
          !p.emprestimo.cliente.nome.toLowerCase().includes(q) &&
          !p.emprestimo.numeroContrato.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [lista, busca, forma, de, ate]);

  const total = filtered.reduce((a, p) => a + Number(p.valor), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recebimentos"
        subtitle="Controle financeiro de pagamentos confirmados e registros em tempo real"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Recebimentos' }]}
        actions={
          <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Registrar pagamento
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Pagamentos (filtro)" value={filtered.length} accent="blue" />
        <MetricCard label="Total recebido" value={brl(total)} accent="green" />
        <MetricCard label="Ticket médio" value={brl(filtered.length ? total / filtered.length : 0)} />
        <MetricCard label="Base total" value={lista.length} hint="Últimos 100 registros" />
      </div>

      <FilterBar>
        <SearchInput value={busca} onChange={setBusca} placeholder="Buscar cliente ou contrato…" />
        <div className="flex flex-wrap gap-2">
          <select className="select w-full sm:w-36" value={forma} onChange={(e) => setForma(e.target.value)}>
            <option value="">Todas formas</option>
            <option value="PIX">PIX</option>
            <option value="DINHEIRO">Dinheiro</option>
            <option value="TED">TED</option>
            <option value="BOLETO">Boleto</option>
            <option value="CARTAO">Cartão</option>
          </select>
          <input className="input w-full sm:w-36" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          <input className="input w-full sm:w-36" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
      </FilterBar>

      {erro && <ErrorBox message={erro} onRetry={carregar} />}

      {loading ? (
        <PageSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum recebimento encontrado"
          description="Registre pagamentos parciais ou totais dos contratos em aberto."
          action={
            <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
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
          {filtered.map((p) => (
            <tr key={p.id}>
              <td className="text-slate-600">{dataBR(p.dataPagamento)}</td>
              <td>
                <Link href={`/admin/clientes/${p.emprestimo.cliente.id}`} className="font-medium hover:text-primary">
                  {p.emprestimo.cliente.nome}
                </Link>
              </td>
              <td>
                <Link href={`/admin/emprestimos/${p.emprestimoId}`} className="font-semibold text-primary hover:underline">
                  {p.emprestimo.numeroContrato}
                </Link>
              </td>
              <td><span className="badge-neutral">{p.forma}</span></td>
              <td className="text-right text-base font-bold text-success">{brl(p.valor)}</td>
            </tr>
          ))}
        </DataTable>
      )}

      <PaymentModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={carregar} />
    </div>
  );
}
