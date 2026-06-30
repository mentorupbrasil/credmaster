import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Monorepo: inclui o build da API NestJS no bundle da função /api/*
    outputFileTracingRoot: path.join(__dirname, '../../'),
    outputFileTracingIncludes: {
      '/api/[[...path]]': [
        '../api/dist/**/*',
        '../../node_modules/.prisma/**/*',
        '../../node_modules/@prisma/client/**/*',
      ],
    },
  },
};

export default nextConfig;
