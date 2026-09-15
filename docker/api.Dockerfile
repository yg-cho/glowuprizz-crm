FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.6.5 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @glowuprizz/api... --filter @glowuprizz/db...

FROM deps AS build
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @glowuprizz/db generate && pnpm --filter @glowuprizz/api build

FROM build AS runner
ENV NODE_ENV=production
WORKDIR /app
EXPOSE 3001
# 기동 시 마이그레이션 적용 → (SEED_OPERATOR_* 있으면) 운영자 upsert → 서버 시작
CMD ["sh", "-c", "pnpm --filter @glowuprizz/db exec prisma migrate deploy && pnpm --filter @glowuprizz/db seed && node apps/api/dist/main.js"]
