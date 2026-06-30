import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    '@credmaster/api',
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/platform-express',
    '@prisma/client',
    'reflect-metadata',
  ],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
    outputFileTracingIncludes: {
      '/api/[[...path]]': [
        '../api/dist/**/*',
        '../api/node_modules/.prisma/**/*',
        '../../node_modules/.prisma/**/*',
        '../../node_modules/@prisma/client/**/*',
      ],
    },
  },
};

export default nextConfig;
