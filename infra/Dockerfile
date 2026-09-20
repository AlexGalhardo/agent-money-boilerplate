# Imagem única para os 3 serviços do Railway (backend, frontend, bot).
#
# Por que isso não é um Dockerfile com "FROM base AS backend / AS frontend
# / AS bot" selecionado via `docker build --target` por serviço, como no
# desenho original: o Railway NÃO suporta escolher um build target de
# multi-stage Dockerfile por serviço — ele sempre builda o Dockerfile
# inteiro (confirmado por um funcionário da Railway em
# https://station.railway.com/questions/use-dockerfile-targets-564aea7a).
# A alternativa aqui — recomendada pela própria comunidade da Railway como
# workaround — é ter UM único estágio final ("runtime") com os 3 serviços
# dentro da mesma imagem; cada Railway service aponta pra essa mesma
# imagem/Dockerfile e escolhe qual processo rodar através da variável de
# ambiente RAILWAY_SERVICE_TARGET (backend | frontend | bot), lida pelo
# railway-entrypoint.sh. Isso ainda entrega os objetivos originais: um
# único Dockerfile como fonte da verdade, e cada serviço no Railway com
# deploy, logs, restart, scaling e variáveis de ambiente independentes.
# Passo a passo completo: docs/deploy-railway.md. Fica em infra/ (não na
# raiz) — o Railway não detecta isso automaticamente, então o "Dockerfile
# Path" de cada um dos 3 serviços precisa apontar pra infra/Dockerfile
# explicitamente (ver docs/deploy-railway.md).
#
# Uso local (fora do Railway, rode a partir da raiz do repo):
#   docker build -f infra/Dockerfile -t agent-money-boilerplate .
#   docker run -p 4000:4000 -e RAILWAY_SERVICE_TARGET=backend --env-file backend/.env agent-money-boilerplate
#
# Para desenvolvimento local com Docker, prefira infra/docker-compose.yml /
# infra/docker-compose.sqlite.yml — builda cada serviço a partir do seu
# próprio Dockerfile (backend/, frontend/, bot/) e já sobe um banco junto.

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

# O bundle SSR do frontend é gerado aqui mesmo que o container final vá
# rodar como backend/bot — mais simples manter uma única imagem com tudo
# pronto do que condicionar o build ao valor de uma env var em build time
# (o Railway não permite variar isso por serviço, ver comentário acima).
FROM install AS frontend-build
# backend/src é necessário apenas para a resolução de tipos do Eden client
# (import type { App } from "@agent-money-boilerplate/backend/src/server")
# durante o build — o runtime final não executa esse código do zero, só a
# API "de verdade" (estágio runtime, mais abaixo) que roda quando
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

# A API escuta em $PORT (padrão 4000) e o frontend em $PORT (padrão 4001,
# ver frontend/server.ts) — o Railway injeta PORT automaticamente por
# serviço, então normalmente você não precisa tocar nisso. O bot não expõe
# porta nenhuma (é um worker, não um servidor HTTP).
EXPOSE 4000 4001
ENTRYPOINT ["./railway-entrypoint.sh"]
