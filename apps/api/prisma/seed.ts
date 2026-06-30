import { PrismaClient, Role, UserStatus, TipoAmortizacao } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@credmaster.dev';
const ADMIN_SENHA = process.env.SEED_ADMIN_SENHA ?? 'Admin@123456';

async function main() {
  console.log('Seed: iniciando...');

  // 1) Parâmetros regulatórios
  await prisma.parametroSistema.upsert({
    where: { chave: 'regulatorio.multa_max_percent' },
    create: {
      chave: 'regulatorio.multa_max_percent',
      valor: '2',
      descricao: 'Multa máxima por atraso (%) - CDC art. 52 §1',
    },
    update: {},
  });
  await prisma.parametroSistema.upsert({
    where: { chave: 'regulatorio.juros_mora_max_mes_percent' },
    create: {
      chave: 'regulatorio.juros_mora_max_mes_percent',
      valor: '1',
      descricao: 'Juros de mora máximo ao mês (%)',
    },
    update: {},
  });

  const paramsExtras: { chave: string; valor: string; descricao: string }[] = [
    {
      chave: 'regulatorio.taxa_juros_max_mes_percent',
      valor: '12',
      descricao: 'Teto de juros remuneratórios ao mês (%) - anti-usura',
    },
    {
      chave: 'regulatorio.valor_min_global',
      valor: '100',
      descricao: 'Valor mínimo global de contrato (R$)',
    },
    {
      chave: 'regulatorio.valor_max_global',
      valor: '1000000',
      descricao: 'Valor máximo global de contrato (R$)',
    },
    {
      chave: 'regulatorio.prazo_min_global',
      valor: '1',
      descricao: 'Prazo mínimo global (meses)',
    },
    {
      chave: 'regulatorio.prazo_max_global',
      valor: '120',
      descricao: 'Prazo máximo global (meses)',
    },
    {
      chave: 'regulatorio.iof_diario_percent',
      valor: '0.0082',
      descricao: 'Alíquota de IOF diário (%) - pessoa física',
    },
    {
      chave: 'regulatorio.iof_adicional_percent',
      valor: '0.38',
      descricao: 'Alíquota de IOF adicional fixa (%)',
    },
  ];
  for (const p of paramsExtras) {
    await prisma.parametroSistema.upsert({
      where: { chave: p.chave },
      create: p,
      update: {},
    });
  }

  // 2) Usuário administrador
  const passwordHash = await argon2.hash(ADMIN_SENHA, { type: argon2.argon2id });
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      nome: 'Administrador',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ATIVO,
      emailVerificado: true,
    },
    update: { role: Role.ADMIN, status: UserStatus.ATIVO, emailVerificado: true },
  });
  console.log(`Seed: admin -> ${admin.email} / senha: ${ADMIN_SENHA}`);

  // 3) Produto de crédito de exemplo
  await prisma.produtoCredito.upsert({
    where: { nome: 'Crédito Pessoal PRICE' },
    create: {
      nome: 'Crédito Pessoal PRICE',
      descricao: 'Empréstimo pessoal em parcelas fixas (Tabela Price)',
      tipoAmortizacao: TipoAmortizacao.PRICE,
      taxaJurosMes: '0.02000000',
      multaAtrasoPercent: '0.02000000',
      jurosMoraMesPercent: '0.01000000',
      prazoMinMeses: 1,
      prazoMaxMeses: 60,
      valorMin: '500.00',
      valorMax: '100000.00',
      ativo: true,
    },
    update: {},
  });

  await prisma.produtoCredito.upsert({
    where: { nome: 'Capital de Giro BULLET' },
    create: {
      nome: 'Capital de Giro BULLET',
      descricao: 'Juros mensais + principal no vencimento final',
      tipoAmortizacao: TipoAmortizacao.BULLET,
      taxaJurosMes: '0.03000000',
      multaAtrasoPercent: '0.02000000',
      jurosMoraMesPercent: '0.01000000',
      prazoMinMeses: 1,
      prazoMaxMeses: 24,
      valorMin: '1000.00',
      valorMax: '500000.00',
      ativo: true,
    },
    update: {},
  });

  console.log('Seed: concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
