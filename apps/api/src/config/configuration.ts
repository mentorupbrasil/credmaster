export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3333', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  timezone: process.env.TIMEZONE ?? 'America/Sao_Paulo',
  app: {
    webUrl: process.env.WEB_URL ?? 'http://localhost:3001',
  },
  mail: {
    from: process.env.MAIL_FROM ?? 'no-reply@credmaster.local',
  },
  sentry: {
    dsn: process.env.SENTRY_DSN ?? '',
  },
  seed: {
    onBoot: process.env.SEED_ON_BOOT ?? 'true',
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@credmaster.dev',
    adminSenha: process.env.SEED_ADMIN_SENHA ?? 'Admin@123456',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    accessTtl: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10),
    refreshTtl: parseInt(process.env.JWT_REFRESH_TTL ?? '2592000', 10),
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '120', 10),
  },
  argon2: {
    memoryCost: parseInt(process.env.ARGON2_MEMORY_COST ?? '19456', 10),
    timeCost: parseInt(process.env.ARGON2_TIME_COST ?? '2', 10),
    parallelism: parseInt(process.env.ARGON2_PARALLELISM ?? '1', 10),
  },
  cobranca: {
    cron: process.env.COBRANCA_CRON ?? '5 0 * * *',
  },
  regulatorio: {
    multaMaxPercent: process.env.PARAM_MULTA_MAX_PERCENT ?? '2',
    jurosMoraMaxMesPercent: process.env.PARAM_JUROS_MORA_MAX_MES_PERCENT ?? '1',
    // Teto de juros remuneratórios ao mês (anti-usura). Configurável.
    taxaJurosMaxMesPercent: process.env.PARAM_TAXA_JUROS_MAX_MES_PERCENT ?? '12',
    // Limites globais de valor/prazo quando não há produto vinculado.
    valorMinGlobal: process.env.PARAM_VALOR_MIN_GLOBAL ?? '100',
    valorMaxGlobal: process.env.PARAM_VALOR_MAX_GLOBAL ?? '1000000',
    prazoMinGlobalMeses: parseInt(process.env.PARAM_PRAZO_MIN_GLOBAL ?? '1', 10),
    prazoMaxGlobalMeses: parseInt(process.env.PARAM_PRAZO_MAX_GLOBAL ?? '120', 10),
    // IOF (Brasil): alíquota diária + alíquota adicional fixa.
    iofDiarioPercent: process.env.PARAM_IOF_DIARIO_PERCENT ?? '0.0082',
    iofAdicionalPercent: process.env.PARAM_IOF_ADICIONAL_PERCENT ?? '0.38',
  },
});
