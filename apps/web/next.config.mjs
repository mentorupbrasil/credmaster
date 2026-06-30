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
    '@nestjs/config',
    '@prisma/client',
    '@codegenie/serverless-express',
    'argon2',
    'reflect-metadata',
    'class-transformer',
    'class-validator',
  ],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
    outputFileTracingIncludes: {
      '/api/[[...path]]': [
        '../api/dist/**',
        '../api/prisma/**',
        '../../node_modules/.prisma/**',
        '../../node_modules/@prisma/client/**',
        '../../node_modules/argon2/**',
        '../../node_modules/@nestjs/**',
        '../../node_modules/@codegenie/**',
        '../../node_modules/reflect-metadata/**',
      ],
    },
  },
};

export default nextConfig;
