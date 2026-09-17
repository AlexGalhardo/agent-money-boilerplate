# Build a partir da raiz do monorepo: docker build -f bot/Dockerfile .
FROM oven/bun:1.4-alpine AS base
WORKDIR /repo

FROM base AS install
COPY package.json bun.lock ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY bot/package.json ./bot/package.json
RUN bun install --frozen-lockfile

FROM install AS runtime
# O bot importa prisma/encrypt/decrypt/transactionService diretamente de
# @elysia-galhardo-finances/backend (ver docs/telegram-bot-plan.md) — precisa do
# código-fonte e do schema Prisma da API dentro da imagem, não só do pacote.
COPY --chown=bun:bun backend/src ./backend/src
COPY --chown=bun:bun backend/prisma ./backend/prisma
COPY --chown=bun:bun backend/prisma7.config.ts ./backend/prisma7.config.ts
COPY --chown=bun:bun backend/tsconfig.json ./backend/tsconfig.json
COPY --chown=bun:bun bot ./bot
WORKDIR /repo/bot
RUN chmod +x docker-entrypoint.sh
USER bun

ENTRYPOINT ["./docker-entrypoint.sh"]
