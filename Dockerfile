# --- Builder: установка всех зависимостей, генерация клиента, сборка ---
FROM node:20-alpine AS builder
WORKDIR /app

# OpenSSL нужен движкам Prisma на alpine (musl).
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma
# npm ci выполнит postinstall (prisma generate).
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# --- Runner: только прод-зависимости + собранный код ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma
# Прод-зависимости (+ postinstall prisma generate под рантайм-движок).
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000

# Применяем миграции, затем стартуем приложение.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
