'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { brl, dataBR, percent } from '@/lib/format';
import { Spinner, ErrorBox, Stat } from '@/components/ui';
import { useFeedback } from '@/components/feedback';

const TIPOS = [
  { v: 'PRICE', l: 'PRICE (parcelas fixas)' },
  { v: 'SAC', l: 'SAC (amortização constante)' },
  { v: 'BULLET', l: 'BULLET (principal no fim)' },
];

export default function SimularPublico() {
  const { toast } = useFeedback();
  const [form, setForm] = useState({
    valorPrincipal: 10000,
    taxaJurosMes: 2,
    tipoAmortizacao: 'PRICE',
    prazoMeses: 12,
    diaVencimento: 10,
  });
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function simular(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (form.valorPrincipal <= 0 || form.prazoMeses < 1) {
      setErro('Preencha valor e prazo válidos.');
      return;
    }
    setLoading(true);
    try {
      const r = await api.simularPublico({
        valorPrincipal: Number(form.valorPrincipal),
        taxaJurosMes: Number(form.taxaJurosMes),
        tipoAmortizacao: form.tipoAmortizacao,
        prazoMeses: Number(form.prazoMeses),
        diaVencimento: Number(form.diaVencimento),
      });
      setResultado(r);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na simulação';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Simulador de crédito</h1>
        <Link href="/login" className="btn-ghost">
          Entrar
        </Link>
      </header>

      <form onSubmit={simular} className="card grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="label">Valor (R$)</label>
          <input
            type="number"
            min={1}
            step="0.01"
            className="input"
            value={form.valorPrincipal}
            onChange={(e) => set('valorPrincipal', Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Taxa de juros (% a.m.)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input"
            value={form.taxaJurosMes}
            onChange={(e) => set('taxaJurosMes', Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Sistema de amortização</label>
          <select
            className="input"
            value={form.tipoAmortizacao}
            onChange={(e) => set('tipoAmortizacao', e.target.value)}
          >
            {TIPOS.map((t) => (
              <option key={t.v} value={t.v}>
                {t.l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Prazo (meses)</label>
          <input
            type="number"
            min={1}
            max={120}
            className="input"
            value={form.prazoMeses}
            onChange={(e) => set('prazoMeses', Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Dia de vencimento</label>
          <input
            type="number"
            min={1}
            max={28}
            className="input"
            value={form.diaVencimento}
            onChange={(e) => set('diaVencimento', Number(e.target.value))}
          />
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Simulando…' : 'Simular'}
          </button>
        </div>
      </form>

      {erro && <ErrorBox message={erro} />}
      {loading && <Spinner />}

      {resultado && !loading && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Total a pagar" value={brl(resultado.totalAPagar)} />
            <Stat label="Total de juros" value={brl(resultado.totalJuros)} accent="amber" />
            <Stat label="IOF" value={brl(resultado.iof ?? 0)} />
            <Stat
              label="CET"
              value={`${percent(resultado.cetMes)} a.m.`}
              hint={`${percent(resultado.cetAno)} a.a.`}
            />
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Vencimento</th>
                  <th className="px-3 py-3">Principal</th>
                  <th className="px-3 py-3">Juros</th>
                  <th className="px-3 py-3">Parcela</th>
                  <th className="px-3 py-3">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {resultado.cronograma.map((p: any) => (
                  <tr key={p.numero} className="border-b border-slate-100">
                    <td className="px-3 py-2">{p.numero}</td>
                    <td className="px-3 py-2">{dataBR(p.vencimento)}</td>
                    <td className="px-3 py-2">{brl(p.valorPrincipal)}</td>
                    <td className="px-3 py-2">{brl(p.valorJuros)}</td>
                    <td className="px-3 py-2 font-medium">{brl(p.valorParcela)}</td>
                    <td className="px-3 py-2">{brl(p.saldoDevedorApos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-sm text-slate-500">
            Gostou das condições?{' '}
            <Link href="/register" className="link">
              Cadastre-se
            </Link>{' '}
            para solicitar.
          </p>
        </section>
      )}
    </main>
  );
}
