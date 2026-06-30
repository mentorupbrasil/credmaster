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
    },
    update: { role: Role.ADMIN, status: UserStatus.ATIVO },
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
