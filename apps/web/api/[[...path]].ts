import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { getServerlessHandler } = await import('../../api/dist/serverless');
  const server = await getServerlessHandler();
  return server(req, res, () => undefined);
}
