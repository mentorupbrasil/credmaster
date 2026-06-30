import path from 'path';
import { createRequire } from 'module';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: { bodyParser: false, externalResolver: true },
  maxDuration: 60,
};

const require = createRequire(path.join(process.cwd(), 'package.json'));

function loadServerlessModule() {
  const distPath = path.join(process.cwd(), '../api/dist/serverless.js');
  return require(distPath) as {
    getServerlessHandler: () => Promise<
      (req: unknown, res: unknown, next: () => void) => void
    >;
  };
}

/** Next.js repassa só os segmentos após /api — o NestJS espera /api/v1/... */
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
    return server(req, res, () => undefined);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('API handler error:', detail, err);
    if (!res.headersSent) {
      res.status(500).json({
        statusCode: 500,
        message: 'Falha ao iniciar a API',
        detail,
      });
    }
  }
}
