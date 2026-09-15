FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.6.5 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @glowuprizz/web...

FROM deps AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN pnpm --filter @glowuprizz/web build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
