# ---------- build stage ----------
FROM node:20-slim AS build
WORKDIR /app

# Necessário para o Prisma engine
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci --workspace @credmaster/api --include-workspace-root

COPY apps/api ./apps/api
RUN npm --workspace @credmaster/api run prisma:generate
RUN npm --workspace @credmaster/api run build

# ---------- runtime stage ----------
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci --omit=dev --workspace @credmaster/api --include-workspace-root

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3333
CMD ["sh", "-c", "npm --workspace @credmaster/api run prisma:migrate:deploy && node apps/api/dist/main.js"]
