import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import type { Application } from 'express';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: { bodyParser: false, externalResolver: true },
  maxDuration: 60,
};

async function loadExpressApp(): Promise<Application> {
  const candidates = [
    path.join(process.cwd(), '.api-dist/serverless.js'),
    path.join(process.cwd(), '../api/dist/serverless.js'),
  ];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;

    // webpackIgnore: carrega o arquivo compilado em runtime, sem bundlar o NestJS.
    const mod = await import(/* webpackIgnore: true */ pathToFileURL(file).href);
    const exp = mod as Record<string, unknown>;
    const nested = exp.default as Record<string, unknown> | undefined;
    const getApp =
      exp.getExpressApp ??
      exp.getServerlessHandler ??
      nested?.getExpressApp ??
      nested?.getServerlessHandler;

    if (typeof getApp !== 'function') {
      throw new Error(
        `Exports inválidos em ${file}: [${Object.keys(exp).join(', ')}]`,
      );
    }

    const app = (await getApp()) as Application;
    if (typeof (app as Application).handle !== 'function') {
      throw new Error(`getExpressApp() não retornou Express válido (${typeof app})`);
    }
    return app;
  }

  throw new Error('Build da API não encontrado (.api-dist ou ../api/dist)');
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
      app.handle(req, res, (err: unknown) => {
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
