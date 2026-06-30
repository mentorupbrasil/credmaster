import path from 'path';
import { createRequire } from 'module';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: { bodyParser: false, externalResolver: true },
  maxDuration: 60,
};

const require = createRequire(path.join(process.cwd(), 'package.json'));

function loadServerlessModule() {
  const bundled = path.join(process.cwd(), '.api-dist/serverless.js');
  const dev = path.join(process.cwd(), '../api/dist/serverless.js');
  const fs = require('node:fs');
  const target = fs.existsSync(bundled) ? bundled : dev;
  return require(target) as {
    getServerlessHandler: () => Promise<
      (req: unknown, res: unknown, next: (err?: unknown) => void) => void
    >;
  };
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
    const { getServerlessHandler } = loadServerlessModule();
    const server = await getServerlessHandler();

    await new Promise<void>((resolve, reject) => {
      res.once('finish', () => resolve());
      res.once('close', () => resolve());
      res.once('error', reject);
      server(req, res, (err?: unknown) => {
        if (err) reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('API handler error:', detail, err);
    if (!res.headersSent) {
      res.status(500).json({
        statusCode: 500,
        message: detail,
      });
    }
  }
}
