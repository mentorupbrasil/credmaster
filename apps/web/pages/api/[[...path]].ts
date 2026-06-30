import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: { externalResolver: true },
  maxDuration: 60,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { getServerlessHandler } = await import('../../../api/dist/serverless');
  const server = await getServerlessHandler();
  return server(req, res, () => undefined);
}
