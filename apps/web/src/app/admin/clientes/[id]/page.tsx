'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageCircle,
  Pencil,
  Trash2,
  Wallet,
  ArrowLeft,
} from 'lucide-react';
import { api } from '@/lib/api';
import { brl, cpfMask, dataBR, phoneMask } from '@/lib/format';
import { whatsappLink, mensagemCobranca } from '@/lib/finance-ui';
import {
  MetricCard,
  PageHeader,
  PageSkeleton,
  ErrorBox,
  StatusBadge,
  DataTable,
  SectionCard,
  Modal,
  EmptyState,
  InfoGrid,
  Timeline,
  FormField,
} from '@/components/ui';
import { useFeedback } from '@/components/feedback';

export default function ClienteDetalhe({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [cliente, setCliente] = useState<any>(null);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
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
      const pg = await api.get<{ data: any[] }>('/pagamentos?pageSize=100');
      setPagamentos(
        pg.data.filter((p) => p.emprestimo?.cliente?.id === params.id).slice(0, 10),
      );
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

  if (erro) return <ErrorBox message={erro} onRetry={carregar} />;
  if (!cliente) return <PageSkeleton />;

  const resumo = cliente.resumoFinanceiro;
  const tel = cliente.whatsapp ?? cliente.telefone;
  const wa = tel
    ? whatsappLink(
        tel,
        mensagemCobranca(cliente.nome, resumo?.totalAberto ?? 0, dataBR(new Date().toISOString())),
      )
    : null;

  const timeline = pagamentos.map((p) => ({
    title: `Pagamento ${brl(p.valor)} — ${p.forma}`,
    subtitle: p.emprestimo?.numeroContrato,
    date: dataBR(p.dataPagamento),
    accent: 'green' as const,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={cliente.nome}
        subtitle={`CPF ${cpfMask(cliente.cpf)} · cadastro ${dataBR(cliente.createdAt)}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Clientes', href: '/admin/clientes' },
          { label: cliente.nome },
        ]}
        badge={<StatusBadge status={cliente.status} />}
        actions={
          <>
            <Link href="/admin/clientes" className="btn-ghost btn-sm">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-success btn-sm">
                <MessageCircle className="h-4 w-4" /> Cobrar
              </a>
            )}
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Editar
            </button>
            <Link href={`/admin/emprestimos/novo?clienteId=${cliente.id}`} className="btn-primary btn-sm">
              <Wallet className="h-4 w-4" /> Novo empréstimo
            </Link>
            <button type="button" className="btn-danger btn-sm" onClick={excluir}>
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        }
      />

      {resumo && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Total emprestado" value={brl(resumo.totalEmprestado)} accent="blue" />
          <MetricCard label="Total recebido" value={brl(resumo.totalRecebido)} accent="green" />
          <MetricCard label="Em aberto" value={brl(resumo.totalAberto)} />
          <MetricCard
            label="Em atraso"
            value={brl(resumo.totalAtraso)}
            accent={Number(resumo.totalAtraso) > 0 ? 'red' : 'default'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
        <SectionCard title="Dados pessoais">
          <InfoGrid
            items={[
              { label: 'E-mail', value: cliente.email },
              { label: 'Telefone', value: phoneMask(cliente.telefone) },
              { label: 'WhatsApp', value: phoneMask(cliente.whatsapp ?? cliente.telefone) },
              { label: 'Renda mensal', value: cliente.rendaMensal ? brl(cliente.rendaMensal) : '—' },
              { label: 'Contratos', value: resumo?.quantidadeContratos ?? 0 },
              { label: 'Status exibição', value: resumo?.statusExibicao ?? cliente.status },
            ]}
          />
          {cliente.observacoes && (
            <div className="mt-4 rounded-xl border border-border bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Observações</p>
              <p className="mt-1 text-sm text-slate-700">{cliente.observacoes}</p>
            </div>
          )}
        </SectionCard>
        </div>

        <SectionCard title="Movimentações recentes">
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum pagamento registrado.</p>
          ) : (
            <Timeline items={timeline} />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Contratos do cliente" noPadding>
        {!cliente.emprestimos?.length ? (
          <EmptyState
            title="Sem contratos"
            description="Este cliente ainda não possui empréstimos."
            action={
              <Link href={`/admin/emprestimos/novo?clienteId=${cliente.id}`} className="btn-primary">
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
              { key: 'venc', label: 'Vencimento' },
            ]}
          >
            {cliente.emprestimos.map((e: any) => (
              <tr key={e.id}>
                <td>
                  <Link href={`/admin/emprestimos/${e.id}`} className="font-semibold text-primary hover:underline">
                    {e.numeroContrato}
                  </Link>
                </td>
                <td>{brl(e.valorPrincipal)}</td>
                <td>
                  <StatusBadge status={e.status} size="sm" />
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
        size="lg"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEditOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={salvarEdicao} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nome">
            <input className="input" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          </FormField>
          <FormField label="E-mail">
            <input className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </FormField>
          <FormField label="Telefone">
            <input className="input" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
          </FormField>
          <FormField label="WhatsApp">
            <input className="input" value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} />
          </FormField>
          <FormField label="Renda mensal">
            <input className="input" type="number" value={form.rendaMensal} onChange={(e) => setForm((f) => ({ ...f, rendaMensal: e.target.value }))} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Observações">
              <textarea className="textarea" value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
            </FormField>
          </div>
        </div>
      </Modal>
    </div>
  );
}
