import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import esbuild from 'esbuild';

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

/** Só módulos nativos/binários ficam fora do bundle. */
const NATIVE_EXTERNALS = ['@prisma/client', 'argon2'];

/** Dependências opcionais do @nestjs/terminus (não usamos, mas ele tenta importar). */
const TERMINUS_OPTIONAL = [
  '@nestjs/mongoose',
  '@nestjs/typeorm',
  '@nestjs/typeorm/dist/common/typeorm.utils',
  '@nestjs/sequelize',
  '@nestjs/sequelize/dist/common/sequelize.utils',
  '@mikro-orm/core',
  'mongoose',
  'typeorm',
  'sequelize',
];

function copyNativeModules(destNm) {
  mkdirSync(destNm, { recursive: true });
  const apiReq = createRequire(path.join(root, 'apps/api/package.json'));

  for (const name of NATIVE_EXTERNALS) {
    try {
      const pkgDir = path.dirname(apiReq.resolve(`${name}/package.json`));
      cpSync(pkgDir, path.join(destNm, ...name.split('/')), { recursive: true });
    } catch (e) {
      console.warn(`Aviso: nativo ${name} não copiado:`, e instanceof Error ? e.message : e);
    }
  }

  const prismaEngine = path.join(root, 'node_modules/.prisma');
  if (existsSync(prismaEngine)) {
    cpSync(prismaEngine, path.join(destNm, '.prisma'), { recursive: true });
  }
}

console.log('Rodando migrations com conexão direta...');
run('npm', ['run', 'api:migrate:deploy'], {
  ...process.env,
  DATABASE_URL: directUrl,
  DIRECT_URL: directUrl,
});

run('npm', ['run', 'api:build']);

const apiDist = path.join(root, 'apps/api/dist');
const webBundle = path.join(root, 'apps/web/.api-dist');
const bundleOut = path.join(webBundle, 'bundle.cjs');

rmSync(webBundle, { recursive: true, force: true });
mkdirSync(webBundle, { recursive: true });

console.log('Empacotando API (esbuild)...');
await esbuild.build({
  entryPoints: [path.join(apiDist, 'serverless.js')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: bundleOut,
  external: [
    ...NATIVE_EXTERNALS,
    ...TERMINUS_OPTIONAL,
    '@nestjs/microservices',
    '@nestjs/websockets',
    '@nestjs/platform-socket.io',
    'class-transformer/storage',
    'cache-manager',
  ],
  logLevel: 'info',
});

copyNativeModules(path.join(webBundle, 'node_modules'));

const sizeMb = (readFileSync(bundleOut).length / 1024 / 1024).toFixed(1);
console.log(`Bundle pronto: .api-dist/bundle.cjs (${sizeMb} MB)`);

run('npm', ['run', 'web:build']);
