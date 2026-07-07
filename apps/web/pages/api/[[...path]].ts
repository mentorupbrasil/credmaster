import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
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

let cachedApp: NestExpress | undefined;

function patchNodePath(bundleRoot: string) {
  const vendor = path.join(bundleRoot, 'vendor');
  if (!fs.existsSync(vendor)) return;
  const sep = path.delimiter;
  process.env.NODE_PATH = [vendor, process.env.NODE_PATH].filter(Boolean).join(sep);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('module').Module._initPaths();
}

async function loadExpressApp(): Promise<NestExpress> {
  if (cachedApp) return cachedApp;

  const bundleRoot = path.join(process.cwd(), '.api-dist');
  const serverlessPath = path.join(bundleRoot, 'apps/api/dist/serverless.js');
  const vendorPath = path.join(bundleRoot, 'vendor');

  if (!fs.existsSync(serverlessPath)) {
    throw new Error(
      `API não empacotada: falta ${serverlessPath}. Verifique o build do Vercel.`,
    );
  }
  if (!fs.existsSync(vendorPath)) {
    throw new Error(
      `Dependências da API ausentes: falta ${vendorPath}. Verifique outputFileTracingIncludes.`,
    );
  }

  patchNodePath(bundleRoot);

  const requireFrom = createRequire(path.join(process.cwd(), 'package.json'));
  requireFrom('reflect-metadata');
  const mod = requireFrom(serverlessPath) as Record<string, unknown>;
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
