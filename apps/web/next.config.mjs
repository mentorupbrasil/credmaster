import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      '@credmaster/api',
      '@nestjs/common',
      '@nestjs/core',
      '@nestjs/platform-express',
      '@nestjs/config',
      '@prisma/client',
      'argon2',
      'reflect-metadata',
      'class-transformer',
      'class-validator',
    ],
    outputFileTracingRoot: path.join(__dirname, '../../'),
    outputFileTracingIncludes: {
      '/api/[[...path]]': [
        '.api-dist/apps/api/dist/**',
        // Next.js exclui pastas "node_modules" do trace — usamos "vendor".
        '.api-dist/vendor/**',
      ],
    },
  },
};

export default nextConfig;
