'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { brl, dataBR } from '@/lib/format';
import { PageHeader, ErrorBox, MetricCard } from '@/components/ui';
import { useFeedback } from '@/components/feedback';

function calcularPreview(
  valorEmprestado: number,
  taxaJurosPercent: number,
  dataEmprestimo: string,
  dataVencimento: string,
) {
  if (!valorEmprestado || !taxaJurosPercent || !dataEmprestimo || !dataVencimento) return null;
  const valorJuros = valorEmprestado * (taxaJurosPercent / 100);
  const valorTotal = valorEmprestado + valorJuros;
  const inicio = new Date(dataEmprestimo + 'T00:00:00Z');
  const fim = new Date(dataVencimento + 'T00:00:00Z');
  const prazoDias = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 86400000));
  return { valorJuros, valorTotal, prazoDias };
}

export default function NovoEmprestimo() {
  const router = useRouter();
  const { toast } = useFeedback();
  const [clientes, setClientes] = useState<any[]>([]);
  const [taxaModo, setTaxaModo] = useState<'20' | '30' | 'custom'>('20');
  const [form, setForm] = useState({
    clienteId: '',
    valorEmprestado: 1000,
    taxaJurosPercent: 20,
    dataEmprestimo: new Date().toISOString().slice(0, 10),
    dataVencimento: '',
    observacoes: '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api
      .get<any>('/clientes?pageSize=100')
      .then((r) => setClientes(r.data))
      .catch(() => undefined);
    const params = new URLSearchParams(window.location.search);
    const clienteId = params.get('clienteId');
    if (clienteId) setForm((f) => ({ ...f, clienteId }));
    api.get<any>('/parametros/config').then((cfg) => {
      const taxa = Number(cfg.taxaJurosPadrao) || 20;
      setTaxaModo(taxa === 30 ? '30' : taxa === 20 ? '20' : 'custom');
      setForm((f) => ({ ...f, taxaJurosPercent: taxa }));
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (taxaModo === '20') setForm((f) => ({ ...f, taxaJurosPercent: 20 }));
    else if (taxaModo === '30') setForm((f) => ({ ...f, taxaJurosPercent: 30 }));
  }, [taxaModo]);

  const preview = useMemo(
    () =>
      calcularPreview(
        form.valorEmprestado,
        form.taxaJurosPercent,
        form.dataEmprestimo,
        form.dataVencimento,
      ),
    [form.valorEmprestado, form.taxaJurosPercent, form.dataEmprestimo, form.dataVencimento],
  );

  function set(field: string, numeric = false) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: numeric ? Number(e.target.value) : e.target.value }));
  }

  async function criar() {
    setErro(null);
    if (!form.clienteId) {
      setErro('Selecione um cliente.');
      return;
    }
    if (!form.dataVencimento) {
      setErro('Informe a data de vencimento.');
      return;
    }
    setSalvando(true);
    try {
      const emp = await api.post<any>('/emprestimos/simples', form);
      toast('Empréstimo criado com sucesso.', 'success');
      router.replace(`/admin/emprestimos/${emp.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo empréstimo"
        subtitle="Empréstimo simples com juros percentual"
        actions={
          <Link href="/admin/emprestimos" className="btn-ghost">
            Voltar
          </Link>
        }
      />

      {erro && <ErrorBox message={erro} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card-premium space-y-4">
          <div>
            <label className="label">Cliente *</label>
            <select className="select" value={form.clienteId} onChange={set('clienteId')}>
              <option value="">Selecione…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} — {c.cpf}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Valor emprestado (R$) *</label>
            <input
              className="input"
              type="number"
              min={1}
              step="0.01"
              value={form.valorEmprestado}
              onChange={set('valorEmprestado', true)}
            />
          </div>

          <div>
            <label className="label">Taxa de juros (%)</label>
            <div className="mb-2 flex gap-2">
              {(['20', '30', 'custom'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={taxaModo === m ? 'btn-primary !py-1.5' : 'btn-ghost !py-1.5'}
                  onClick={() => setTaxaModo(m)}
                >
                  {m === 'custom' ? 'Personalizada' : `${m}%`}
                </button>
              ))}
            </div>
            {taxaModo === 'custom' && (
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={form.taxaJurosPercent}
                onChange={set('taxaJurosPercent', true)}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data do empréstimo *</label>
              <input
                className="input"
                type="date"
                value={form.dataEmprestimo}
                onChange={set('dataEmprestimo')}
              />
            </div>
            <div>
              <label className="label">Data de vencimento *</label>
              <input
                className="input"
                type="date"
                value={form.dataVencimento}
                onChange={set('dataVencimento')}
              />
            </div>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea
              className="input min-h-[80px]"
              value={form.observacoes}
              onChange={set('observacoes')}
            />
          </div>

          <button className="btn-primary w-full" onClick={criar} disabled={salvando}>
            {salvando ? 'Criando…' : 'Criar empréstimo'}
          </button>
        </div>

        <div className="card-premium space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Prévia do cálculo</h2>
          {preview ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Valor emprestado" value={brl(form.valorEmprestado)} />
                <MetricCard label="Juros" value={brl(preview.valorJuros)} accent="blue" />
                <MetricCard label="Total a pagar" value={brl(preview.valorTotal)} accent="green" />
                <MetricCard label="Prazo" value={`${preview.prazoDias} dias`} />
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                <p>
                  <strong>Vencimento:</strong> {dataBR(form.dataVencimento)}
                </p>
                <p className="mt-1">
                  <strong>Taxa:</strong> {form.taxaJurosPercent}% sobre o principal
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Preencha os campos para ver a prévia do cálculo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
