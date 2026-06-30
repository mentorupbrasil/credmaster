# ---------- build stage ----------
FROM node:20-slim AS build
WORKDIR /app

# Necessário para o Prisma engine
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Manifests primeiro (cache de dependências)
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
# Schema precisa existir antes do `npm ci` por causa do postinstall (prisma generate)
COPY apps/api/prisma ./apps/api/prisma
RUN npm ci --workspace @credmaster/api --include-workspace-root

# Código e build
COPY apps/api ./apps/api
RUN npm --workspace @credmaster/api run build

# ---------- runtime stage ----------
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
RUN npm ci --omit=dev --workspace @credmaster/api --include-workspace-root

COPY --from=build /app/apps/api/dist ./apps/api/dist

EXPOSE 3333
CMD ["sh", "-c", "npm --workspace @credmaster/api run prisma:migrate:deploy && node apps/api/dist/main.js"]
