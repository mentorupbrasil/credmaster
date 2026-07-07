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

function patchNodePath(bundleRoot: string) {
  const nm = path.join(bundleRoot, 'node_modules');
  if (!fs.existsSync(nm)) return;
  const sep = path.delimiter;
  process.env.NODE_PATH = [nm, process.env.NODE_PATH].filter(Boolean).join(sep);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('module').Module._initPaths();
}

async function loadExpressApp(): Promise<NestExpress> {
  const bundleRoot = path.join(process.cwd(), '.api-dist');
  patchNodePath(bundleRoot);

  const serverlessPath = path.join(bundleRoot, 'apps/api/dist/serverless.js');
  if (!fs.existsSync(serverlessPath)) {
    throw new Error(`serverless.js não encontrado em ${serverlessPath}`);
  }

  const requireFrom = createRequire(path.join(process.cwd(), 'package.json'));
  const mod = requireFrom(serverlessPath) as Record<string, unknown>;
  const getApp = mod.getExpressApp ?? mod.getServerlessHandler;

  if (typeof getApp !== 'function') {
    throw new Error(
      `Exports inválidos: [${Object.keys(mod).join(', ')}]`,
    );
  }

  const app = await getApp();
  if (typeof app !== 'function') {
    throw new Error(`getExpressApp() retornou ${typeof app}, esperava function`);
  }
  return app as NestExpress;
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
