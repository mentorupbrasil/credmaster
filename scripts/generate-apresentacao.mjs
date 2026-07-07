#!/usr/bin/env node
/**
 * Gera PDF premium de apresentação do CredMaster com prints reais das telas.
 * Uso: node scripts/generate-apresentacao.mjs
 * Requer: app rodando em http://localhost:3000 e API acessível.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'apresentacao');
const SHOTS_DIR = path.join(OUT_DIR, 'screenshots');
const BASE_URL = process.env.DECK_BASE_URL ?? 'http://localhost:3000';
const API_URL = process.env.DECK_API_URL ?? 'http://localhost:3333/api/v1';
const ADMIN_EMAIL = process.env.DECK_ADMIN_EMAIL ?? 'admin@credmaster.dev';
const ADMIN_SENHA = process.env.DECK_ADMIN_SENHA ?? 'Admin@123456';

const SECTIONS = [
  {
    id: 'intro',
    label: 'Visão geral',
    screens: [
      {
        id: 'visao-geral',
        type: 'text',
        title: 'CredMaster — Plataforma de Gestão de Crédito',
        subtitle: 'Solução completa para empréstimos particulares e instituições financeiras',
        bullets: [
          'Painel administrativo com visão executiva da carteira',
          'Cadastro de clientes, contratos e produtos de crédito',
          'Controle de recebimentos, cobrança e inadimplência',
          'Relatórios financeiros e conformidade regulatória',
          'Portal do cliente para acompanhamento de contratos',
          'Simulador público de crédito para captação de leads',
        ],
      },
    ],
  },
  {
    id: 'acesso',
    label: 'Acesso & captação',
    screens: [
      {
        id: 'login',
        path: '/login',
        title: 'Login',
        description:
          'Ponto de entrada seguro para administradores, analistas e clientes. Autenticação com sessão protegida, redirecionamento automático conforme o perfil e links para cadastro, recuperação de senha e simulação.',
      },
      {
        id: 'register',
        path: '/register',
        title: 'Cadastro de cliente',
        description:
          'Permite que novos clientes criem conta no portal. Após o registro, o usuário acessa seus empréstimos, parcelas e notificações de forma autônoma.',
      },
      {
        id: 'esqueci-senha',
        path: '/esqueci-senha',
        title: 'Recuperação de senha',
        description:
          'Fluxo de redefinição de senha por e-mail, garantindo segurança e autonomia ao usuário sem intervenção manual da operação.',
      },
      {
        id: 'simular',
        path: '/simular',
        title: 'Simulador de crédito',
        description:
          'Ferramenta pública para simular valor, prazo e taxa de juros. Ideal para captação de leads e transparência com o cliente antes da contratação.',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Painel administrativo',
    auth: true,
    screens: [
      {
        id: 'dashboard',
        path: '/admin',
        title: 'Dashboard executivo',
        description:
          'Visão consolidada do negócio: clientes ativos, carteira emprestada, recebimentos do mês, inadimplência, gráficos de status e listas de vencimentos e pagamentos recentes.',
      },
      {
        id: 'clientes',
        path: '/admin/clientes',
        title: 'Gestão de clientes',
        description:
          'Listagem completa com busca, filtros e paginação. Permite visualizar status, contato e acessar o perfil detalhado de cada cliente.',
      },
      {
        id: 'clientes-novo',
        path: '/admin/clientes/novo',
        title: 'Novo cliente',
        description:
          'Formulário estruturado para cadastro com dados pessoais, documentos, contato e endereço. Base para vincular contratos e histórico financeiro.',
      },
      {
        id: 'clientes-detalhe',
        path: '/admin/clientes',
        title: 'Perfil do cliente',
        description:
          'Visão 360° do cliente: dados cadastrais, score, empréstimos vinculados, histórico de pagamentos e ações rápidas para operação.',
        dynamic: 'cliente',
      },
      {
        id: 'emprestimos',
        path: '/admin/emprestimos',
        title: 'Empréstimos',
        description:
          'Controle de todos os contratos: status, valores, parcelas e saldo devedor. Filtros por situação (ativo, atraso, liquidado) e busca por cliente ou contrato.',
      },
      {
        id: 'emprestimos-novo',
        path: '/admin/emprestimos/novo',
        title: 'Novo empréstimo',
        description:
          'Contratação guiada: seleção de cliente, produto de crédito, valor, prazo e simulação automática de parcelas (Price, SAC, Bullet).',
      },
      {
        id: 'emprestimos-detalhe',
        path: '/admin/emprestimos',
        title: 'Detalhe do contrato',
        description:
          'Acompanhamento completo do empréstimo: cronograma de parcelas, pagamentos registrados, saldo em aberto, multas e registro de novos recebimentos.',
        dynamic: 'emprestimo',
      },
      {
        id: 'recebimentos',
        path: '/admin/recebimentos',
        title: 'Recebimentos',
        description:
          'Central de baixas e conciliação. Registro de pagamentos por parcela, formas de recebimento e histórico para auditoria financeira.',
      },
      {
        id: 'cobranca',
        path: '/admin/cobranca',
        title: 'Cobrança',
        description:
          'Fila operacional de inadimplência: contratos em atraso, dias de atraso, valores devidos e ferramentas para gestão de recuperação.',
      },
      {
        id: 'relatorios',
        path: '/admin/relatorios',
        title: 'Relatórios',
        description:
          'Indicadores e exportações para tomada de decisão: carteira, recebimentos, lucratividade e métricas de performance por período.',
      },
      {
        id: 'configuracoes',
        path: '/admin/configuracoes',
        title: 'Configurações',
        description:
          'Parametrização do sistema: produtos de crédito, taxas, limites regulatórios, identidade visual e regras operacionais da instituição.',
      },
    ],
  },
  {
    id: 'portal',
    label: 'Portal do cliente',
    screens: [
      {
        id: 'portal-info',
        type: 'text',
        title: 'Portal do cliente',
        subtitle: 'Experiência dedicada ao tomador de crédito',
        bullets: [
          'Listagem de empréstimos ativos e liquidados',
          'Detalhe de parcelas, vencimentos e saldo devedor',
          'Central de notificações sobre pagamentos e avisos',
          'Interface responsiva, alinhada ao painel administrativo',
          'Acesso via login com perfil CLIENTE após cadastro',
        ],
      },
    ],
  },
  {
    id: 'fechamento',
    label: 'Encerramento',
    screens: [
      {
        id: 'fechamento',
        type: 'text',
        title: 'Pronto para escalar sua operação de crédito',
        subtitle: 'CredMaster — tecnologia, controle e experiência premium',
        bullets: [
          'Implantação sob medida para sua operação',
          'Conformidade com parâmetros regulatórios (CDC, IOF, limites de juros)',
          'Interface moderna, clara e profissional',
          'Suporte a múltiplos produtos e tipos de amortização',
          'Entre em contato para demonstração ao vivo e proposta comercial',
        ],
      },
    ],
  },
];

async function waitForServer(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.ok || res.status === 307 || res.status === 308) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function apiLogin() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, senha: ADMIN_SENHA }),
  });
  if (!res.ok) throw new Error('API login falhou');
  const data = await res.json();
  return data.accessToken ?? data.access_token ?? data.token;
}

async function ensureDemoData() {
  try {
    const token = await apiLogin();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const listRes = await fetch(`${API_URL}/clientes?limit=1`, { headers });
    const list = listRes.ok ? await listRes.json() : null;
    const existing = list?.data?.[0] ?? list?.items?.[0];

    let clienteId = existing?.id;
    if (!clienteId) {
      const cpf = '52998224725';
      const createRes = await fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nome: 'Maria Demonstração Silva',
          cpf,
          telefone: '11999998888',
          email: 'maria.demo@credmaster.dev',
          rendaMensal: 8500,
          cidade: 'São Paulo',
          uf: 'SP',
        }),
      });
      if (createRes.ok) {
        const created = await createRes.json();
        clienteId = created.id;
        await fetch(`${API_URL}/clientes/${clienteId}/aprovar`, {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        }).catch(() => undefined);
        console.log('  + Cliente demo criado para capturas de detalhe');
      }
    }

    if (clienteId) {
      const empRes = await fetch(`${API_URL}/emprestimos?limit=1`, { headers });
      const empList = empRes.ok ? await empRes.json() : null;
      const hasLoan = empList?.data?.[0] ?? empList?.items?.[0];
      if (!hasLoan) {
        const loanRes = await fetch(`${API_URL}/emprestimos`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            clienteId,
            valorPrincipal: 15000,
            taxaJurosMes: 2,
            tipoAmortizacao: 'PRICE',
            prazoMeses: 12,
            diaVencimento: 10,
          }),
        });
        if (loanRes.ok) console.log('  + Empréstimo demo criado para capturas de detalhe');
      }
    }
  } catch (err) {
    console.warn(`  ⚠ Dados demo não criados: ${err.message}`);
  }
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_SENHA);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL(/\/admin/, { timeout: 20000 });
  } catch {
    const err = await page.locator('.text-danger-700, [class*="danger"]').first().textContent().catch(() => null);
    throw new Error(err?.trim() || 'Login falhou — verifique se a API está rodando (npm run dev)');
  }
  await page.waitForTimeout(1500);
}

async function capturePage(page, url, filePath) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: filePath, fullPage: false });
}

async function resolveDynamicPath(page, kind) {
  if (kind === 'cliente') {
    await page.goto(`${BASE_URL}/admin/clientes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const href = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/admin/clientes/"]');
      for (const el of links) {
        const h = el.getAttribute('href') ?? '';
        const parts = h.split('/').filter(Boolean);
        if (parts.length >= 3 && parts[0] === 'admin' && parts[1] === 'clientes' && parts[2] !== 'novo') {
          return h;
        }
      }
      return null;
    });
    if (href) return href.startsWith('http') ? href : `${BASE_URL}${href}`;
  }
  if (kind === 'emprestimo') {
    await page.goto(`${BASE_URL}/admin/emprestimos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const href = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/admin/emprestimos/"]');
      for (const el of links) {
        const h = el.getAttribute('href') ?? '';
        const parts = h.split('/').filter(Boolean);
        if (parts.length >= 3 && parts[0] === 'admin' && parts[1] === 'emprestimos' && parts[2] !== 'novo') {
          return h;
        }
      }
      return null;
    });
    if (href) return href.startsWith('http') ? href : `${BASE_URL}${href}`;
  }
  return null;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(slides) {
  const slideHtml = slides
    .map((slide, index) => {
      if (slide.type === 'cover') {
        return `
        <section class="slide slide-cover">
          <div class="cover-inner">
            <div class="cover-badge">Apresentação comercial</div>
            <h1>CredMaster</h1>
            <p class="cover-tagline">Plataforma premium de gestão de crédito</p>
            <p class="cover-desc">Demonstração funcional das telas do sistema — ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
            <div class="cover-footer">
              <span>Confidencial</span>
              <span>•</span>
              <span>Uso comercial</span>
            </div>
          </div>
        </section>`;
      }

      if (slide.type === 'text') {
        const bullets = (slide.bullets ?? [])
          .map((b) => `<li>${escapeHtml(b)}</li>`)
          .join('');
        return `
        <section class="slide slide-text">
          <div class="slide-meta">
            <span class="section-tag">${escapeHtml(slide.section ?? '')}</span>
            <span class="slide-num">${String(index + 1).padStart(2, '0')}</span>
          </div>
          <h2>${escapeHtml(slide.title)}</h2>
          ${slide.subtitle ? `<p class="subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
          <ul class="bullets">${bullets}</ul>
          <div class="brand-bar">CredMaster</div>
        </section>`;
      }

      const img = slide.imageDataUri
        ? `<img src="${slide.imageDataUri}" alt="${escapeHtml(slide.title)}" />`
        : `<div class="no-shot">Captura indisponível — acesse ${escapeHtml(slide.path ?? '')} com dados cadastrados</div>`;

      return `
      <section class="slide slide-screen">
        <div class="slide-meta">
          <span class="section-tag">${escapeHtml(slide.section ?? '')}</span>
          <span class="slide-num">${String(index + 1).padStart(2, '0')}</span>
        </div>
        <div class="screen-grid">
          <div class="shot-wrap">${img}</div>
          <div class="copy">
            <h2>${escapeHtml(slide.title)}</h2>
            <p>${escapeHtml(slide.description ?? '')}</p>
            ${slide.path ? `<code class="route">${escapeHtml(slide.path)}</code>` : ''}
          </div>
        </div>
        <div class="brand-bar">CredMaster</div>
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>CredMaster — Apresentação</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 landscape; margin: 0; }
    body { font-family: Inter, system-ui, sans-serif; color: #111827; background: #fff; }
    .slide {
      width: 297mm; height: 210mm; page-break-after: always;
      position: relative; overflow: hidden; padding: 14mm 16mm 12mm;
      background: #fff;
    }
    .slide:last-child { page-break-after: auto; }
    .slide-cover {
      background: linear-gradient(135deg, #4F46E5 0%, #312E81 55%, #1E1B4B 100%);
      color: #fff; display: flex; align-items: center; justify-content: center;
    }
    .cover-inner { text-align: center; max-width: 520px; }
    .cover-badge {
      display: inline-block; font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
      border: 1px solid rgba(255,255,255,.35); border-radius: 999px; padding: 6px 14px; margin-bottom: 28px;
    }
    .slide-cover h1 {
      font-family: 'Plus Jakarta Sans', Inter, sans-serif;
      font-size: 52px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 12px;
    }
    .cover-tagline { font-size: 20px; opacity: .92; margin-bottom: 18px; }
    .cover-desc { font-size: 13px; opacity: .75; line-height: 1.6; }
    .cover-footer { margin-top: 48px; font-size: 11px; opacity: .55; display: flex; gap: 10px; justify-content: center; }
    .slide-meta {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 10mm;
    }
    .section-tag {
      font-size: 10px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase;
      color: #4F46E5; background: #EEF2FF; padding: 5px 10px; border-radius: 6px;
    }
    .slide-num { font-size: 11px; color: #9CA3AF; font-weight: 600; }
    .slide-text h2, .slide-screen h2 {
      font-family: 'Plus Jakarta Sans', Inter, sans-serif;
      font-size: 28px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px;
    }
    .subtitle { font-size: 15px; color: #6B7280; margin-bottom: 18px; }
    .bullets { margin-top: 8mm; padding-left: 18px; }
    .bullets li { font-size: 14px; line-height: 1.65; color: #374151; margin-bottom: 8px; }
    .screen-grid {
      display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 10mm; align-items: start; height: calc(100% - 22mm);
    }
    .shot-wrap {
      border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;
      box-shadow: 0 8px 30px rgba(17,24,39,.08); background: #F9FAFB; height: 100%;
      display: flex; align-items: flex-start; justify-content: center;
    }
    .shot-wrap img { width: 100%; height: auto; display: block; }
    .copy p { font-size: 13.5px; line-height: 1.7; color: #4B5563; margin-top: 10px; }
    .route {
      display: inline-block; margin-top: 14px; font-size: 11px; color: #6B7280;
      background: #F3F4F6; padding: 6px 10px; border-radius: 6px;
    }
    .no-shot {
      padding: 40px 24px; text-align: center; color: #6B7280; font-size: 13px; line-height: 1.6;
    }
    .brand-bar {
      position: absolute; left: 16mm; right: 16mm; bottom: 8mm;
      border-top: 1px solid #F3F4F6; padding-top: 6px;
      font-size: 10px; color: #9CA3AF; letter-spacing: .06em; text-transform: uppercase;
    }
  </style>
</head>
<body>${slideHtml}</body>
</html>`;
}

async function main() {
  console.log('CredMaster — gerando apresentação PDF...\n');

  await mkdir(SHOTS_DIR, { recursive: true });

  const serverOk = await waitForServer(BASE_URL);
  if (!serverOk) {
    console.error(`\n❌ App não responde em ${BASE_URL}`);
    console.error('   Inicie com: npm run dev (na raiz do projeto)\n');
    process.exit(1);
  }

  console.log('Preparando dados de demonstração...');
  await ensureDemoData();
  console.log('');

  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.log('Instalando Playwright (primeira execução)...');
    await new Promise((resolve, reject) => {
      const p = spawn('npm', ['install', 'playwright@1.49.1', '--no-save'], {
        cwd: ROOT,
        shell: true,
        stdio: 'inherit',
      });
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('npm install playwright failed'))));
    });
    playwright = await import('playwright');
    await new Promise((resolve, reject) => {
      const p = spawn('npx', ['playwright', 'install', 'chromium'], {
        cwd: ROOT,
        shell: true,
        stdio: 'inherit',
      });
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('playwright install failed'))));
    });
  }

  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const slides = [{ type: 'cover' }];
  let loggedIn = false;

  for (const section of SECTIONS) {
    for (const screen of section.screens) {
      if (screen.type === 'text') {
        slides.push({ ...screen, section: section.label });
        continue;
      }

      let targetPath = screen.path;
      if (section.auth && !loggedIn) {
        await login(page);
        loggedIn = true;
      }

      if (screen.dynamic) {
        const dynamicUrl = loggedIn ? await resolveDynamicPath(page, screen.dynamic) : null;
        if (dynamicUrl) {
          const shotPath = path.join(SHOTS_DIR, `${screen.id}.png`);
          await capturePage(page, dynamicUrl, shotPath);
          const buf = await readFile(shotPath);
          slides.push({
            ...screen,
            section: section.label,
            path: dynamicUrl.replace(BASE_URL, ''),
            imageDataUri: `data:image/png;base64,${buf.toString('base64')}`,
          });
          console.log(`  ✓ ${screen.title} (detalhe)`);
          continue;
        }
        slides.push({ ...screen, section: section.label, path: screen.path });
        console.log(`  ○ ${screen.title} (sem dados — slide explicativo)`);
        continue;
      }

      const url = `${BASE_URL}${targetPath}`;
      const shotPath = path.join(SHOTS_DIR, `${screen.id}.png`);
      try {
        await capturePage(page, url, shotPath);
        const buf = await readFile(shotPath);
        slides.push({
          ...screen,
          section: section.label,
          imageDataUri: `data:image/png;base64,${buf.toString('base64')}`,
        });
        console.log(`  ✓ ${screen.title}`);
      } catch (err) {
        console.warn(`  ⚠ ${screen.title}: ${err.message}`);
        slides.push({ ...screen, section: section.label });
      }
    }
  }

  await browser.close();

  const html = buildHtml(slides);
  const htmlPath = path.join(OUT_DIR, 'apresentacao.html');
  await writeFile(htmlPath, html, 'utf8');

  const browser2 = await playwright.chromium.launch({ headless: true });
  const pdfPage = await browser2.newPage();
  await pdfPage.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
  const pdfPath = path.join(OUT_DIR, 'CredMaster-Apresentacao-Cliente.pdf');
  await pdfPage.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await browser2.close();

  console.log(`\n✅ PDF gerado: ${pdfPath}`);
  console.log(`   HTML: ${htmlPath}`);
  console.log(`   Screenshots: ${SHOTS_DIR}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
