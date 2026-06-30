import type { Express } from 'express';
import { prepareServerlessEnv } from './prepare-env';
import { createNestApp } from './bootstrap';

let cached: Express | undefined;

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
