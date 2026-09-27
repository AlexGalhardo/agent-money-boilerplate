# Build from the monorepo root: docker build -f backend/Dockerfile .
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

FROM install AS runtime
COPY --chown=bun:bun backend ./backend
WORKDIR /repo/backend
RUN chmod +x docker-entrypoint.sh && mkdir -p /data && chown bun:bun /data
USER bun

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
