import type { Express } from 'express';
import { createNestApp } from './bootstrap';

let cached: Express | undefined;

function prepareServerlessEnv(): void {
  if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL.replace('-pooler', '');
  }
  if (!process.env.VERCEL) {
    process.env.VERCEL = '1';
  }
}

/** App Express do NestJS — reutilizado entre invocações no Vercel. */
export async function getExpressApp(): Promise<Express> {
  prepareServerlessEnv();
  if (!cached) {
    const { expressApp } = await createNestApp();
    cached = expressApp;
  }
  return cached;
}

/** Alias legado (mesmo retorno). */
export async function getServerlessHandler(): Promise<Express> {
  return getExpressApp();
}
