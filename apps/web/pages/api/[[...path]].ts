import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: { bodyParser: false, externalResolver: true },
  maxDuration: 60,
};

type NestExpress = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (err?: unknown) => void,
) => void;

declare const __non_webpack_require__: NodeRequire;

let cachedApp: NestExpress | undefined;

function runtimeRequire(): NodeRequire {
  if (typeof __non_webpack_require__ === 'function') {
    return __non_webpack_require__;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require;
}

function resolveBundleRoot(): string {
  const candidates = [
    path.join(process.cwd(), '.api-dist'),
    path.join(process.cwd(), 'apps/web/.api-dist'),
  ];
  for (const root of candidates) {
    if (fs.existsSync(path.join(root, 'apps/api/dist/serverless.js'))) {
      return root;
    }
  }
  throw new Error(
    'API não empacotada (.api-dist ausente). Verifique o build do Vercel.',
  );
}

function patchNodePath(bundleRoot: string) {
  const vendor = path.join(bundleRoot, 'vendor');
  if (!fs.existsSync(vendor)) {
    throw new Error(
      `Dependências da API ausentes: falta ${vendor}. Verifique outputFileTracingIncludes.`,
    );
  }
  const sep = path.delimiter;
  process.env.NODE_PATH = [vendor, process.env.NODE_PATH].filter(Boolean).join(sep);
  runtimeRequire()('module').Module._initPaths();
}

async function loadExpressApp(): Promise<NestExpress> {
  if (cachedApp) return cachedApp;

  const bundleRoot = resolveBundleRoot();
  patchNodePath(bundleRoot);

  const req = runtimeRequire();
  req('reflect-metadata');

  const serverlessPath = path.join(bundleRoot, 'apps/api/dist/serverless.js');
  const mod = req(serverlessPath) as Record<string, unknown>;
  const getApp = mod.getExpressApp ?? mod.getServerlessHandler;

  if (typeof getApp !== 'function') {
    throw new Error(`Exports inválidos: [${Object.keys(mod).join(', ')}]`);
  }

  const app = await getApp();
  if (typeof app !== 'function') {
    throw new Error(`getExpressApp() retornou ${typeof app}, esperava function`);
  }

  cachedApp = app as NestExpress;
  return cachedApp;
}

function patchUrl(req: NextApiRequest) {
  const raw = req.query.path;
  if (!raw) return;
  const parts = (Array.isArray(raw) ? raw : [raw]).map(String);
  const qs = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  req.url = `/api/${parts.join('/')}${qs}`;
  // Next.js inclui `path` em req.query; o ValidationPipe da API rejeita campos extras.
  delete req.query.path;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    patchUrl(req);
    const app = await loadExpressApp();

    await new Promise<void>((resolve, reject) => {
      res.once('finish', () => resolve());
      res.once('close', () => resolve());
      res.once('error', reject);
      app(req, res, (err?: unknown) => {
        if (err) reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('API handler error:', detail, err);
    if (!res.headersSent) {
      res.status(500).json({ statusCode: 500, message: detail });
    }
  }
}
