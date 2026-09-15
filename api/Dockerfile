# Build a partir da raiz do monorepo: docker build -f api/Dockerfile .
FROM oven/bun:1.4-alpine AS base
WORKDIR /repo

FROM base AS install
COPY package.json bun.lock ./
COPY api/package.json ./api/package.json
COPY frontend/package.json ./frontend/package.json
RUN bun install --frozen-lockfile

FROM install AS runtime
COPY --chown=bun:bun api ./api
WORKDIR /repo/api
RUN chmod +x docker-entrypoint.sh && mkdir -p /data && chown bun:bun /data
USER bun

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
