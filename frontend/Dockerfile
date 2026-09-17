# Build a partir da raiz do monorepo: docker build -f frontend/Dockerfile .
FROM oven/bun:1.4-alpine AS base
WORKDIR /repo

FROM base AS install
COPY package.json bun.lock ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN bun install --frozen-lockfile

FROM install AS build
# backend/src é necessário apenas para a resolução de tipos do Eden
# (import type { App } from "@elysia-galhardo-finances/backend/src/server")
# durante o build — o runtime final não inclui o código da API.
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY frontend ./frontend
WORKDIR /repo/frontend
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN bunx tsr generate && bun run build

FROM base AS runtime
# Bun instala dependências tanto na raiz quanto em node_modules por
# workspace (não fica tudo hoisted na raiz) — os dois precisam vir
# junto para a resolução de módulos (ex.: "react") funcionar em runtime.
COPY --from=install --chown=bun:bun /repo/node_modules ./node_modules
COPY --from=install --chown=bun:bun /repo/frontend/node_modules ./frontend/node_modules
COPY --from=build --chown=bun:bun /repo/frontend/dist ./frontend/dist
COPY --chown=bun:bun frontend/package.json ./frontend/package.json
COPY --chown=bun:bun frontend/server.ts ./frontend/server.ts
COPY --chown=bun:bun frontend/proxy-paths.ts ./frontend/proxy-paths.ts
WORKDIR /repo/frontend
USER bun
ENV PORT=4001

EXPOSE 4001
CMD ["bun", "server.ts"]
