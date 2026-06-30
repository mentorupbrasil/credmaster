import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: { bodyParser: false, externalResolver: true },
  maxDuration: 60,
};

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
    const { getServerlessHandler } = await import('@credmaster/api/serverless');
    const server = await getServerlessHandler();
    return server(req as never, res as never, () => undefined);
  } catch (err) {
    console.error('API handler error:', err);
    if (!res.headersSent) {
      res.status(500).json({ statusCode: 500, message: 'Falha ao iniciar a API' });
    }
  }
}
