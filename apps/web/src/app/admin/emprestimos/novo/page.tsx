'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { brl, dataBR, percent } from '@/lib/format';
import { ErrorBox } from '@/components/ui';

export default function NovoEmprestimo() {
  const router = useRouter();
  const [clientes, setClientes] = useState<any[]>([]);
  const [form, setForm] = useState({
    clienteId: '',
    valorPrincipal: 10000,
    taxaJurosMes: 2,
    tipoAmortizacao: 'PRICE',
    prazoMeses: 6,
    diaVencimento: 1,
    multaAtrasoPercent: 2,
    jurosMoraMesPercent: 1,
  });
  const [sim, setSim] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api
      .get<any>('/clientes?status=APROVADO&pageSize=100')
      .then((r) => setClientes(r.data))
      .catch(() => undefined);
    const params = new URLSearchParams(window.location.search);
    const clienteId = params.get('clienteId');
    if (clienteId) setForm((f) => ({ ...f, clienteId }));
  }, []);

  function set(field: string, numeric = false) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: numeric ? Number(e.target.value) : e.target.value }));
  }

  async function simular() {
    setErro(null);
    try {
      const { clienteId, multaAtrasoPercent, jurosMoraMesPercent, ...rest } = form;
      const r = await api.post('/emprestimos/simular', rest);
      setSim(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    }
  }

  async function criar() {
    setErro(null);
    if (!form.clienteId) {
      setErro('Selecione um cliente.');
      return;
    }
    setSalvando(true);
    try {
      const emp = await api.post<any>('/emprestimos', form);
      router.replace(`/admin/emprestimos/${emp.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo empréstimo</h1>
      {erro && <ErrorBox message={erro} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <div>
            <label className="label">Cliente</label>
            <select className="input" value={form.clienteId} onChange={set('clienteId')}>
              <option value="">Selecione…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} — {c.cpf}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor principal (R$)">
              <input className="input" type="number" value={form.valorPrincipal} onChange={set('valorPrincipal', true)} />
            </Field>
            <Field label="Prazo (meses)">
              <input className="input" type="number" value={form.prazoMeses} onChange={set('prazoMeses', true)} />
            </Field>
            <Field label="Taxa de juros (% a.m.)">
              <input className="input" type="number" step="0.01" value={form.taxaJurosMes} onChange={set('taxaJurosMes', true)} />
            </Field>
            <Field label="Dia do vencimento">
              <input className="input" type="number" min={1} max={28} value={form.diaVencimento} onChange={set('diaVencimento', true)} />
            </Field>
            <Field label="Amortização">
              <select className="input" value={form.tipoAmortizacao} onChange={set('tipoAmortizacao')}>
                <option value="PRICE">PRICE (parcelas fixas)</option>
                <option value="SAC">SAC (amortização constante)</option>
                <option value="BULLET">BULLET (juros + principal no fim)</option>
              </select>
            </Field>
            <Field label="Multa atraso (%)">
              <input className="input" type="number" step="0.01" value={form.multaAtrasoPercent} onChange={set('multaAtrasoPercent', true)} />
            </Field>
            <Field label="Juros de mora (% a.m.)">
              <input className="input" type="number" step="0.01" value={form.jurosMoraMesPercent} onChange={set('jurosMoraMesPercent', true)} />
            </Field>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={simular}>
              Simular
            </button>
            <button className="btn-primary" onClick={criar} disabled={salvando}>
              {salvando ? 'Criando…' : 'Criar empréstimo'}
            </button>
          </div>
        </div>

        {sim && (
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold">Simulação</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Resumo label="Total de juros" value={brl(sim.totalJuros)} />
              <Resumo label="Total a pagar" value={brl(sim.totalAPagar)} />
              <Resumo label="CET ao mês" value={percent(sim.cetMes)} />
              <Resumo label="CET ao ano" value={percent(sim.cetAno)} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b text-left text-slate-500">
                  <tr>
                    <th className="py-2">#</th>
                    <th className="py-2">Vencimento</th>
                    <th className="py-2">Juros</th>
                    <th className="py-2">Amort.</th>
                    <th className="py-2">Parcela</th>
                    <th className="py-2">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.cronograma.map((p: any) => (
                    <tr key={p.numero} className="border-b border-slate-100">
                      <td className="py-1.5">{p.numero}</td>
                      <td className="py-1.5">{dataBR(p.vencimento)}</td>
                      <td className="py-1.5">{brl(p.valorJuros)}</td>
                      <td className="py-1.5">{brl(p.valorPrincipal)}</td>
                      <td className="py-1.5 font-medium">{brl(p.valorParcela)}</td>
                      <td className="py-1.5">{brl(p.saldoDevedorApos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
