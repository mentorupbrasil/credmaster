import serverlessExpress from '@codegenie/serverless-express';
import type { Handler } from 'express';
import { createNestApp } from './bootstrap';

let cached: Handler | undefined;

/** Handler reutilizado entre invocações (warm start no Vercel). */
export async function getServerlessHandler(): Promise<Handler> {
  if (!cached) {
    const { expressApp } = await createNestApp();
    cached = serverlessExpress({ app: expressApp });
  }
  return cached;
}
