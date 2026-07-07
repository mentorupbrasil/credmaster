'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { brl, cpfMask, dataBR, phoneMask } from '@/lib/format';
import {
  MetricCard,
  PageHeader,
  Spinner,
  ErrorBox,
  StatusBadge,
  DataTable,
  SectionCard,
  Modal,
  EmptyState,
} from '@/components/ui';
import { useFeedback } from '@/components/feedback';

export default function ClienteDetalhe({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [cliente, setCliente] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    try {
      const c = await api.get<any>(`/clientes/${params.id}`);
      setCliente(c);
      setForm({
        nome: c.nome ?? '',
        telefone: c.telefone ?? '',
        whatsapp: c.whatsapp ?? '',
        email: c.email ?? '',
        observacoes: c.observacoes ?? '',
        rendaMensal: c.rendaMensal ? String(c.rendaMensal) : '',
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    }
  }, [params.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function excluir() {
    const ok = await confirm({
      titulo: 'Excluir cliente',
      mensagem: 'Esta ação não pode ser desfeita. Deseja continuar?',
      confirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    try {
      await api.post(`/clientes/${params.id}/excluir`);
      toast('Cliente excluído.', 'success');
      router.replace('/admin/clientes');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao excluir', 'error');
    }
  }

  async function salvarEdicao() {
    setSalvando(true);
    try {
      await api.put(`/clientes/${params.id}`, {
        nome: form.nome,
        telefone: form.telefone.replace(/\D/g, ''),
        whatsapp: form.whatsapp?.replace(/\D/g, ''),
        email: form.email,
        observacoes: form.observacoes || undefined,
        rendaMensal: form.rendaMensal ? Number(form.rendaMensal) : undefined,
      });
      toast('Cliente atualizado.', 'success');
      setEditOpen(false);
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao salvar', 'error');
    } finally {
      setSalvando(false);
    }
  }

  if (erro) return <ErrorBox message={erro} />;
  if (!cliente) return <Spinner />;

  const resumo = cliente.resumoFinanceiro;

  return (
    <div className="space-y-6">
      <PageHeader
        title={cliente.nome}
        subtitle={cpfMask(cliente.cpf)}
        actions={
          <>
            <StatusBadge status={cliente.status} />
            <button className="btn-ghost" onClick={() => setEditOpen(true)}>
              Editar
            </button>
            <Link
              href={`/admin/emprestimos/novo?clienteId=${cliente.id}`}
              className="btn-primary"
            >
              Criar empréstimo
            </Link>
            <button className="btn-danger" onClick={excluir}>
              Excluir
            </button>
          </>
        }
      />

      <div className="card-premium grid grid-cols-2 gap-4 md:grid-cols-4">
        <Info label="E-mail" value={cliente.email} />
        <Info label="Telefone" value={phoneMask(cliente.telefone)} />
        <Info label="WhatsApp" value={phoneMask(cliente.whatsapp ?? cliente.telefone)} />
        <Info label="Renda mensal" value={cliente.rendaMensal ? brl(cliente.rendaMensal) : '—'} />
        <Info label="Aprovado em" value={dataBR(cliente.aprovadoEm)} />
        <Info label="Contratos" value={resumo?.quantidadeContratos ?? 0} />
      </div>

      {resumo && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard label="Total emprestado" value={brl(resumo.totalEmprestado)} accent="blue" />
          <MetricCard label="Total recebido" value={brl(resumo.totalRecebido)} accent="green" />
          <MetricCard label="Total em aberto" value={brl(resumo.totalAberto)} />
          <MetricCard
            label="Total em atraso"
            value={brl(resumo.totalAtraso)}
            accent={Number(resumo.totalAtraso) > 0 ? 'red' : 'default'}
          />
        </div>
      )}

      <SectionCard title="Empréstimos">
        {(!cliente.emprestimos || cliente.emprestimos.length === 0) ? (
          <EmptyState
            title="Sem empréstimos"
            description="Este cliente ainda não possui contratos."
            action={
              <Link
                href={`/admin/emprestimos/novo?clienteId=${cliente.id}`}
                className="btn-primary"
              >
                Criar empréstimo
              </Link>
            }
          />
        ) : (
          <DataTable
            columns={[
              { key: 'contrato', label: 'Contrato' },
              { key: 'principal', label: 'Principal' },
              { key: 'status', label: 'Status' },
              { key: 'data', label: 'Vencimento' },
            ]}
          >
            {cliente.emprestimos.map((e: any) => (
              <tr key={e.id}>
                <td>
                  <Link
                    href={`/admin/emprestimos/${e.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {e.numeroContrato}
                  </Link>
                </td>
                <td>{brl(e.valorPrincipal)}</td>
                <td>
                  <StatusBadge status={e.status} />
                </td>
                <td>{dataBR(e.dataFinal)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar cliente"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={salvarEdicao} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Nome</label>
            <input
              className="input"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input
              className="input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input
              className="input"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">WhatsApp</label>
            <input
              className="input"
              value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Renda mensal</label>
            <input
              className="input"
              type="number"
              value={form.rendaMensal}
              onChange={(e) => setForm((f) => ({ ...f, rendaMensal: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea
              className="input min-h-[80px]"
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 font-medium text-slate-800">{value}</p>
    </div>
  );
}
