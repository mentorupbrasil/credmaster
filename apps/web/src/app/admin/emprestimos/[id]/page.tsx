'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { brl, dataBR, percent } from '@/lib/format';
import { Badge, Spinner, ErrorBox, Stat } from '@/components/ui';
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

  async function liberar() {
    const ok = await confirm({
      titulo: 'Liberar crédito',
      mensagem: 'Confirmar o desembolso e ativação deste contrato?',
      confirmar: 'Liberar',
    });
    if (!ok) return;
    setAcao(true);
    try {
      await api.post(`/emprestimos/${params.id}/liberar`);
      toast('Crédito liberado.', 'success');
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao liberar', 'error');
    } finally {
      setAcao(false);
    }
  }

  async function pagar(parcela: any) {
    const emAberto = (
      Number(parcela.valorParcela) +
      Number(parcela.multa) +
      Number(parcela.jurosMora) -
      Number(parcela.valorPago)
    ).toFixed(2);
    const valorStr = await prompt({
      titulo: `Registrar pagamento — parcela ${parcela.numero}`,
      mensagem: `Valor em aberto: R$ ${emAberto}`,
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
        titulo: 'Quitação antecipada',
        mensagem: `Valor de quitação hoje: ${brl(prev.valorQuitacao)}. Abatimento de juros futuros: ${brl(
          prev.abatimentoJurosFuturos,
        )}. Confirmar?`,
        confirmar: 'Quitar',
      });
      if (!ok) return;
      setAcao(true);
      await api.post(`/emprestimos/${params.id}/quitar`, { forma: 'PIX' });
      toast('Contrato quitado.', 'success');
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao quitar', 'error');
    } finally {
      setAcao(false);
    }
  }

  if (erro) return <ErrorBox message={erro} />;
  if (!emp) return <Spinner />;

  const r = emp.resumo;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{emp.numeroContrato}</h1>
        <Badge status={emp.status} />
        <span className="text-slate-500">{emp.cliente?.nome}</span>
        <div className="ml-auto flex gap-2">
          {emp.status === 'AGUARDANDO_APROVACAO' && (
            <button className="btn-primary" onClick={liberar} disabled={acao}>
              {acao ? 'Liberando…' : 'Liberar crédito'}
            </button>
          )}
          {['ATIVO', 'EM_ATRASO', 'INADIMPLENTE'].includes(emp.status) && (
            <button className="btn-ghost" onClick={quitar} disabled={acao}>
              {acao ? 'Processando…' : 'Quitar antecipadamente'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Principal" value={brl(emp.valorPrincipal)} />
        <Stat label="Saldo devedor" value={brl(r.saldoDevedor)} />
        <Stat label="Total a pagar" value={brl(emp.totalAPagar)} />
        <Stat label="IOF" value={brl(emp.iof ?? 0)} />
        <Stat label="CET" value={`${percent(emp.cetMes)} a.m.`} hint={`${percent(emp.cetAno)} a.a.`} />
        <Stat label="Próximo vencimento" value={dataBR(r.proximoVencimento)} />
        <Stat label="Valor próxima parcela" value={brl(r.valorProximaParcela)} />
        <Stat label="Dias em atraso" value={r.diasAtraso} accent={r.diasAtraso > 0 ? 'red' : 'default'} />
        <Stat label="Encargos acumulados" value={brl(r.encargosAcumulados)} accent="amber" />
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Cronograma</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Vencimento</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Parcela</th>
                <th className="px-3 py-3">Encargos</th>
                <th className="px-3 py-3">Pago</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {emp.parcelas.map((p: any) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{p.numero}</td>
                  <td className="px-3 py-2">{dataBR(p.vencimento)}</td>
                  <td className="px-3 py-2">{p.tipo}</td>
                  <td className="px-3 py-2 font-medium">{brl(p.valorParcela)}</td>
                  <td className="px-3 py-2">{brl(Number(p.multa) + Number(p.jurosMora))}</td>
                  <td className="px-3 py-2">{brl(p.valorPago)}</td>
                  <td className="px-3 py-2">
                    <Badge status={p.status} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {['ATIVO', 'EM_ATRASO'].includes(emp.status) &&
                      p.status !== 'PAGA' &&
                      p.status !== 'CANCELADA' && (
                        <button className="btn-primary !py-1" onClick={() => pagar(p)}>
                          Registrar pagamento
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Histórico de pagamentos</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3">Valor</th>
                <th className="px-3 py-3">Forma</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{dataBR(p.dataPagamento)}</td>
                  <td className="px-3 py-2">{brl(p.valor)}</td>
                  <td className="px-3 py-2">{p.forma}</td>
                  <td className="px-3 py-2">
                    <Badge status={p.status} />
                  </td>
                </tr>
              ))}
              {pagamentos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                    Nenhum pagamento registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
