import { spawnSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
  console.error(
    'ERRO: defina DATABASE_URL no Vercel (Settings → Environment Variables).',
  );
  process.exit(1);
}

// Neon: migrations usam conexão direta; se DIRECT_URL não existir, reutiliza DATABASE_URL.
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL.replace('-pooler', '');
  console.log('DIRECT_URL ausente — usando fallback derivado de DATABASE_URL.');
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('npm', ['run', 'api:migrate:deploy']);
run('npm', ['run', 'api:build']);
run('npm', ['run', 'web:build']);
