ARG NODE_VERSION=22.14.0
ARG BUN_VERSION=1.4.3
FROM oven/bun:${BUN_VERSION} AS bun
FROM node:${NODE_VERSION}-slim AS build
ARG NUXT_UMAMI_ID=""
ARG NUXT_UMAMI_HOST=""
ENV NUXT_UMAMI_ID=$NUXT_UMAMI_ID NUXT_UMAMI_HOST=$NUXT_UMAMI_HOST
ENV NODE_OPTIONS=--max-old-space-size=4096 NUXT_TELEMETRY_DISABLED=1
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /frontend
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
RUN bun run postinstall && bun run build

FROM node:${NODE_VERSION}-slim AS production
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /frontend
COPY --from=build --chown=node:node /frontend/.output ./.output
USER node
ENV HOST=0.0.0.0 PORT=3000
CMD ["bun", ".output/server/index.mjs"]
