import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

class EnvVars {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.development;

  @IsInt()
  @Min(1)
  PORT = 3333;

  @IsString()
  API_PREFIX = 'api';

  @IsString()
  @IsOptional()
  CORS_ORIGINS = 'http://localhost:3000';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  DIRECT_URL?: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsInt()
  JWT_ACCESS_TTL = 900;

  @IsInt()
  JWT_REFRESH_TTL = 2592000;

  @IsInt()
  RATE_LIMIT_TTL = 60;

  @IsInt()
  RATE_LIMIT_MAX = 120;

  @IsInt()
  ARGON2_MEMORY_COST = 19456;

  @IsInt()
  ARGON2_TIME_COST = 2;

  @IsInt()
  ARGON2_PARALLELISM = 1;

  @IsString()
  COBRANCA_CRON = '5 0 * * *';

  @IsString()
  TIMEZONE = 'America/Sao_Paulo';

  @IsString()
  PARAM_MULTA_MAX_PERCENT = '2';

  @IsString()
  PARAM_JUROS_MORA_MAX_MES_PERCENT = '1';
}

function intEnv(key: string, fallback: number) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function validateEnv(_config: Record<string, unknown>) {
  const validated = plainToInstance(EnvVars, {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    PORT: intEnv('PORT', 3333),
    API_PREFIX: process.env.API_PREFIX ?? 'api',
    CORS_ORIGINS: process.env.CORS_ORIGINS ?? 'http://localhost:3000',
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_ACCESS_TTL: intEnv('JWT_ACCESS_TTL', 900),
    JWT_REFRESH_TTL: intEnv('JWT_REFRESH_TTL', 2592000),
    RATE_LIMIT_TTL: intEnv('RATE_LIMIT_TTL', 60),
    RATE_LIMIT_MAX: intEnv('RATE_LIMIT_MAX', 120),
    ARGON2_MEMORY_COST: intEnv('ARGON2_MEMORY_COST', 19456),
    ARGON2_TIME_COST: intEnv('ARGON2_TIME_COST', 2),
    ARGON2_PARALLELISM: intEnv('ARGON2_PARALLELISM', 1),
    COBRANCA_CRON: process.env.COBRANCA_CRON ?? '5 0 * * *',
    TIMEZONE: process.env.TIMEZONE ?? 'America/Sao_Paulo',
    PARAM_MULTA_MAX_PERCENT: process.env.PARAM_MULTA_MAX_PERCENT ?? '2',
    PARAM_JUROS_MORA_MAX_MES_PERCENT: process.env.PARAM_JUROS_MORA_MAX_MES_PERCENT ?? '1',
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Configuração de ambiente inválida:\n${errors
        .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
        .join('\n')}`,
    );
  }
  return validated;
}
