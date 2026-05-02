ARG NODE_VERSION=22.14 LINUX_VERSION="slim"
FROM node:${NODE_VERSION}${LINUX_VERSION:+-$LINUX_VERSION} AS build

WORKDIR /frontend

COPY --link package.json bun.lock /frontend/

RUN npm install -g bun
RUN bun install --frozen-lockfile

COPY --link . /frontend

RUN bun run build

FROM node:${NODE_VERSION}${LINUX_VERSION:+-$LINUX_VERSION} AS production

COPY --from=build /frontend/.output /frontend/.output

WORKDIR /frontend

RUN npm install -g bun

CMD ["bun", ".output/server/index.mjs"]