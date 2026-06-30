declare module '@credmaster/api/serverless' {
  import type { Handler } from 'express';
  export function getServerlessHandler(): Promise<Handler>;
}
