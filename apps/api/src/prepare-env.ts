/** Ajustes de ambiente necessários antes do Prisma/NestJS subirem no Vercel. */
export function prepareServerlessEnv(): void {
  if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL.replace('-pooler', '');
  }
  if (!process.env.VERCEL) {
    process.env.VERCEL = '1';
  }
}
