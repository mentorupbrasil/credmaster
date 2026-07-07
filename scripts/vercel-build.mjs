import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
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

let webBundle = '';

function copyIntoVendor(relFromRoot) {
  const src = path.join(root, relFromRoot);
  if (!existsSync(src)) return false;
  const vendorRel = relFromRoot.replace(/^node_modules[/\\]/, '');
  const dest = path.join(webBundle, 'vendor', vendorRel);
  if (existsSync(dest)) return false;
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
  return true;
}

function vendorHasPackage(vendorDir, name) {
  return existsSync(path.join(vendorDir, name, 'package.json'));
}

function findVendorPackageJsonFiles(vendorDir) {
  const files = [];

  function walk(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(current, entry.name);
      if (!entry.isDirectory()) continue;

      const pkgJson = path.join(full, 'package.json');
      if (existsSync(pkgJson)) {
        files.push(pkgJson);
        continue;
      }

      // Escopos (@nestjs, @prisma, …)
      if (entry.name.startsWith('@')) {
        walk(full);
      }
    }
  }

  walk(vendorDir);
  return files;
}

/** Copia dependências transitivas que o NFT não rastreia (ex.: lodash/get). */
function closeVendorDependencies(vendorDir) {
  let added = 0;

  for (let round = 0; round < 25; round++) {
    let changed = false;

    for (const pkgJsonPath of findVendorPackageJsonFiles(vendorDir)) {
      const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
      const deps = {
        ...pkg.dependencies,
        ...pkg.optionalDependencies,
        ...pkg.peerDependencies,
      };

      for (const dep of Object.keys(deps ?? {})) {
        if (vendorHasPackage(vendorDir, dep)) continue;
        if (copyIntoVendor(`node_modules/${dep}`)) {
          changed = true;
          added++;
        }
      }
    }

    if (!changed) break;
  }

  return added;
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
webBundle = path.join(root, 'apps/web/.api-dist');
const vendorDir = path.join(webBundle, 'vendor');

rmSync(webBundle, { recursive: true, force: true });
mkdirSync(vendorDir, { recursive: true });

cpSync(apiDist, path.join(webBundle, 'apps/api/dist'), { recursive: true });

console.log('Rastreando dependências da API (@vercel/nft)...');
const { fileList } = await nodeFileTrace([entry], { base: root, processCwd: root });

let copied = 0;
for (const abs of fileList) {
  if (!existsSync(abs)) continue;
  const rel = path.relative(root, abs).replace(/\\/g, '/');
  if (!rel.startsWith('node_modules/')) continue;
  const dest = path.join(vendorDir, rel.slice('node_modules/'.length));
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(abs, dest);
  copied++;
}

const nativePaths = [
  'node_modules/argon2',
  'node_modules/.prisma',
  'node_modules/@prisma/client',
  'node_modules/@phc/format',
  'node_modules/node-gyp-build',
  'node_modules/reflect-metadata',
];
for (const rel of nativePaths) {
  if (copyIntoVendor(rel)) copied++;
}

const closureAdded = closeVendorDependencies(vendorDir);

const vendorFiles = countFiles(vendorDir);
console.log(
  `Vendor: ${copied} arquivos rastreados, +${closureAdded} pacotes no closure, ${vendorFiles} arquivos totais`,
);

if (!existsSync(path.join(vendorDir, 'lodash/get.js'))) {
  console.error('ERRO: lodash/get.js ausente no vendor após o build.');
  process.exit(1);
}

run('npm', ['run', 'web:build']);

function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) n += countFiles(full);
    else n++;
  }
  return n;
}
