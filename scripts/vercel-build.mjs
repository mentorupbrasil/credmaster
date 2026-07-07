import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { nodeFileTrace } from '@vercel/nft';

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

function copyIntoVendor(relFromRoot) {
  const src = path.join(root, relFromRoot);
  if (!existsSync(src)) return;
  const vendorRel = relFromRoot.replace(/^node_modules[/\\]/, '');
  const dest = path.join(webBundle, 'vendor', vendorRel);
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
}

console.log('Rodando migrations conexão direta...');
run('npm', ['run', 'api:migrate:deploy'], {
  ...process.env,
  DATABASE_URL: directUrl,
  DIRECT_URL: directUrl,
});

run('npm', ['run', 'api:build']);

const apiDist = path.join(root, 'apps/api/dist');
const entry = path.join(apiDist, 'serverless.js');
const webBundle = path.join(root, 'apps/web/.api-dist');

rmSync(webBundle, { recursive: true, force: true });
mkdirSync(path.join(webBundle, 'vendor'), { recursive: true });

// Código compilado da API
cpSync(apiDist, path.join(webBundle, 'apps/api/dist'), { recursive: true });

console.log('Rastreando dependências da API (@vercel/nft)...');
const { fileList } = await nodeFileTrace([entry], { base: root, processCwd: root });

let copied = 0;
for (const abs of fileList) {
  if (!existsSync(abs)) continue;
  const rel = path.relative(root, abs).replace(/\\/g, '/');
  if (!rel.startsWith('node_modules/')) continue;
  const dest = path.join(webBundle, 'vendor', rel.slice('node_modules/'.length));
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(abs, dest);
  copied++;
}

// Binários nativos (argon2, Prisma) — Next.js não inclui pastas node_modules no deploy.
const nativePaths = [
  'node_modules/argon2',
  'node_modules/.prisma',
  'node_modules/@prisma/client',
  'node_modules/@phc/format',
  'node_modules/node-gyp-build',
  'node_modules/reflect-metadata',
];
for (const rel of nativePaths) {
  copyIntoVendor(rel);
}

console.log(`Dependências em .api-dist/vendor: ${copied}+ arquivos rastreados`);

run('npm', ['run', 'web:build']);
