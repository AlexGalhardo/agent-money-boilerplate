# Single image for the 3 Railway services (backend, frontend, bot).
#
# Why not one Dockerfile with "FROM base AS backend / AS frontend / AS bot"
# picked per service via `docker build --target`: Railway does NOT support
# choosing a multi-stage build target per service — it always builds the
# whole Dockerfile (confirmed by Railway staff at
# https://station.railway.com/questions/use-dockerfile-targets-564aea7a).
# The workaround the Railway community recommends is ONE final stage
# ("runtime") holding all 3 services; every Railway service points at this
# same image/Dockerfile and picks its process through the
# RAILWAY_SERVICE_TARGET env var (backend | frontend | bot), read by
# railway-entrypoint.sh. That still gives one Dockerfile as the source of
# truth, with independent deploys, logs, restarts, scaling and env vars per
# service. Full walkthrough: docs/deploy/railway.md. It lives in infra/ (not
# the root), which Railway doesn't detect, so each service's "Dockerfile
# Path" must point at infra/Dockerfile explicitly.
#
# Local use (outside Railway, run from the repo root):
#   docker build -f infra/Dockerfile -t agent-money-boilerplate .
#   docker run -p 4000:4000 -e RAILWAY_SERVICE_TARGET=backend --env-file backend/.env agent-money-boilerplate
#
# For local development with Docker, prefer infra/docker-compose.yml /
# infra/docker-compose.sqlite.yml — they build each service from its own
# Dockerfile (backend/, frontend/, bot/) and start a database alongside.

FROM oven/bun:1.4-alpine AS base
WORKDIR /repo

FROM base AS install
COPY package.json bun.lock ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY bot/package.json ./bot/package.json
# root package.json's patchedDependencies (nativewind, only actually used by
# mobile/) applies to every `bun install` in this workspace regardless of
# which workspaces are on disk - without the patch file present, install
# fails with "Couldn't find patch file" even though mobile/ itself is never
# copied into this image.
COPY patches ./patches
RUN bun install --frozen-lockfile

# The frontend SSR bundle is built even when the container will run as
# backend/bot — one ready-made image is simpler than making the build depend
# on a build-time env var (Railway can't vary it per service, see above).
FROM install AS frontend-build
# backend/src is only needed to resolve the Eden client types
# (import type { App } from "@agent-money-boilerplate/backend/src/server")
# during the build; the API itself runs from the runtime stage below when
# RAILWAY_SERVICE_TARGET=backend.
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY frontend ./frontend
WORKDIR /repo/frontend
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN bunx tsr generate && bun run build

FROM install AS runtime
COPY --chown=bun:bun backend ./backend
COPY --chown=bun:bun bot ./bot
COPY --chown=bun:bun frontend/package.json frontend/server.ts frontend/proxy-paths.ts ./frontend/
COPY --from=frontend-build --chown=bun:bun /repo/frontend/dist ./frontend/dist
COPY --chown=bun:bun setups/railway-entrypoint.sh ./railway-entrypoint.sh
RUN chmod +x railway-entrypoint.sh \
	&& mkdir -p /data && chown bun:bun /data
USER bun

# The API listens on $PORT (default 4000) and the frontend on $PORT (default
# 4001, see frontend/server.ts) — Railway injects PORT per service. The bot
# exposes no port (it's a worker, not an HTTP server).
EXPOSE 4000 4001
ENTRYPOINT ["./railway-entrypoint.sh"]
