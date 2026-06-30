'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { brl } from '@/lib/format';
import { Stat, Spinner, ErrorBox } from '@/components/ui';

interface Resumo {
  clientesAtivos: number;
  clientesPendentes: number;
  emprestimosAtivos: number;
  emAtraso: number;
  liquidados: number;
  vencendoHoje: number;
  valorTotalEmprestado: string;
  valorRecebidoNoMes: string;
  carteiraEmAtraso: string;
}

export default function AdminDashboard() {
  const [data, setData] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Resumo>('/dashboard')
      .then(setData)
      .catch((e) => setErro(e.message));
  }, []);

  if (erro) return <ErrorBox message={erro} />;
  if (!data) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clientes ativos" value={data.clientesAtivos} />
        <Stat label="Empréstimos ativos" value={data.emprestimosAtivos} />
        <Stat label="Valor total emprestado" value={brl(data.valorTotalEmprestado)} />
        <Stat label="Recebido no mês" value={brl(data.valorRecebidoNoMes)} accent="green" />
        <Stat label="Em atraso" value={data.emAtraso} accent="red" />
        <Stat label="Vencendo hoje" value={data.vencendoHoje} accent="amber" />
        <Stat label="Liquidados" value={data.liquidados} accent="green" />
        <Stat label="Cadastros pendentes" value={data.clientesPendentes} accent="amber" />
      </div>
      <Stat
        label="Carteira em atraso (com encargos)"
        value={brl(data.carteiraEmAtraso)}
        accent="red"
      />
    </div>
  );
}
