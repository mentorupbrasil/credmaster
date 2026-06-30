import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { createRequire } from 'node:module';
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

/** Copia árvore de dependências da API para .api-dist/node_modules (runtime Vercel). */
function copyApiDependencies(apiPkgDir, destRoot) {
  const apiReq = createRequire(path.join(apiPkgDir, 'package.json'));
  const apiPkg = JSON.parse(readFileSync(path.join(apiPkgDir, 'package.json'), 'utf8'));
  const toCopy = new Set();

  function collect(name) {
    if (toCopy.has(name)) return;
    toCopy.add(name);
    try {
      const pkgJsonPath = apiReq.resolve(`${name}/package.json`);
      const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
      for (const dep of Object.keys(pkg.dependencies ?? {})) collect(dep);
    } catch {
      /* pacote opcional / não resolvível */
    }
  }

  for (const dep of Object.keys(apiPkg.dependencies ?? {})) collect(dep);

  const destNm = path.join(destRoot, 'node_modules');
  mkdirSync(destNm, { recursive: true });

  for (const name of toCopy) {
    try {
      const pkgDir = path.dirname(apiReq.resolve(`${name}/package.json`));
      const dest = path.join(destNm, ...name.split('/'));
      mkdirSync(path.dirname(dest), { recursive: true });
      cpSync(pkgDir, dest, { recursive: true, dereference: true });
    } catch (e) {
      console.warn(`Aviso: não copiou ${name}:`, e instanceof Error ? e.message : e);
    }
  }

  // Prisma engine (gerado pelo postinstall)
  const prismaEngine = path.join(root, 'node_modules/.prisma');
  if (existsSync(prismaEngine)) {
    cpSync(prismaEngine, path.join(destNm, '.prisma'), { recursive: true });
  }

  console.log(`Dependências em .api-dist/node_modules: ${toCopy.size} pacotes`);
}

console.log('Rodando migrations com conexão direta...');
run('npm', ['run', 'api:migrate:deploy'], {
  ...process.env,
  DATABASE_URL: directUrl,
  DIRECT_URL: directUrl,
});

run('npm', ['run', 'api:build']);

const apiDist = path.join(root, 'apps/api/dist');
const apiPkgDir = path.join(root, 'apps/api');
const webBundle = path.join(root, 'apps/web/.api-dist');

rmSync(webBundle, { recursive: true, force: true });
cpSync(apiDist, webBundle, { recursive: true });
copyApiDependencies(apiPkgDir, webBundle);

const files = readdirSync(webBundle).filter((f) => f.endsWith('.js'));
console.log(`API copiada para apps/web/.api-dist (${files.length} arquivos .js)`);

run('npm', ['run', 'web:build']);
