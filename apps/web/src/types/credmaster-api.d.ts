declare module '@credmaster/api/serverless' {
  import type { Express } from 'express';
  export function getExpressApp(): Promise<Express>;
  export function getServerlessHandler(): Promise<Express>;
}
