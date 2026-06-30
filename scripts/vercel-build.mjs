import { cpSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

if (!process.env.DATABASE_URL) {
  console.error(
    'ERRO: defina DATABASE_URL no Vercel (Settings → Environment Variables).',
  );
  process.exit(1);
}

const poolerUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL ?? poolerUrl.replace('-pooler', '');

function run(cmd, args, env = process.env) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// Migrations no Neon precisam de conexão direta (sem pooler).
console.log('Rodando migrations com conexão direta...');
run('npm', ['run', 'api:migrate:deploy'], {
  ...process.env,
  DATABASE_URL: directUrl,
  DIRECT_URL: directUrl,
});

run('npm', ['run', 'api:build']);

// Copia o build da API para dentro do web (garante bundle no deploy Vercel).
const apiDist = path.join(root, 'apps/api/dist');
const webBundle = path.join(root, 'apps/web/.api-dist');
rmSync(webBundle, { recursive: true, force: true });
cpSync(apiDist, webBundle, { recursive: true });
const files = readdirSync(webBundle).filter((f) => f.endsWith('.js'));
console.log(`API copiada para apps/web/.api-dist (${files.length} arquivos .js)`);

run('npm', ['run', 'web:build']);
