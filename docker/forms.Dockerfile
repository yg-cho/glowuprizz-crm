FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.6.5 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/forms/package.json apps/forms/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @glowuprizz/forms... --filter @glowuprizz/db...

FROM deps AS build
COPY packages ./packages
COPY apps/forms ./apps/forms
RUN pnpm --filter @glowuprizz/db generate && pnpm --filter @glowuprizz/forms build

FROM build AS runner
ENV NODE_ENV=production
WORKDIR /app/apps/forms
EXPOSE 3002
CMD ["node", "dist/main.js"]
