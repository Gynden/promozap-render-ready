FROM oven/bun:1.3.14 AS base
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.json ./
COPY packages/web/package.json packages/web/package.json
COPY packages/desktop/package.json packages/desktop/package.json
COPY packages/mobile/package.json packages/mobile/package.json

RUN bun install --frozen-lockfile

COPY . .
RUN bun run build:web

ENV NODE_ENV=production
EXPOSE 10000
CMD ["bun", "run", "--cwd", "packages/web", "start"]
