# Build from the monorepo root: docker build -f frontend/Dockerfile .
FROM oven/bun:1.4-alpine AS base
WORKDIR /repo

FROM base AS install
COPY package.json bun.lock ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY bot/package.json ./bot/package.json
# The root package.json's patchedDependencies (nativewind, used only by
# mobile/) apply to every `bun install` in the workspace — without the patch
# file, install fails with "Couldn't find patch file".
COPY patches ./patches
RUN bun install --frozen-lockfile

FROM install AS build
# backend/src is only needed to resolve the Eden types
# (import type { App } from "@agent-money-boilerplate/backend/src/server")
# during the build — the final image doesn't include the API code.
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY frontend ./frontend
WORKDIR /repo/frontend
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN bunx tsr generate && bun run build

FROM base AS runtime
# Bun installs dependencies both at the root and in per-workspace
# node_modules — both are needed for module resolution (e.g. "react") at
# runtime.
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
