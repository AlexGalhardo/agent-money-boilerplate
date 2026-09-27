#!/bin/sh
# Dispatcher dos 3 serviços do Railway (backend, frontend, bot) a partir da
# MESMA imagem — ver docs/deploy-railway.md para o porquê (Railway não
# suporta escolher um build target de Dockerfile por serviço). Cada
# Railway service define a variável RAILWAY_SERVICE_TARGET para escolher
# qual processo esse container efetivamente roda.
set -e

case "$RAILWAY_SERVICE_TARGET" in
	backend)
		cd backend
		bunx prisma migrate deploy
		bunx prisma generate
		exec bun run src/server.ts
		;;
	frontend)
		cd frontend
		exec bun server.ts
		;;
	bot)
		# O bot usa o Prisma Client gerado dentro de backend/prisma/generated (mesmo
		# schema, mesmo banco da API) — precisa ser gerado no filesystem deste
		# container também.
		(cd backend && bunx prisma generate)
		cd bot
		exec bun run src/index.ts
		;;
	*)
		echo "RAILWAY_SERVICE_TARGET precisa ser 'backend', 'frontend' ou 'bot' (valor atual: '${RAILWAY_SERVICE_TARGET}'). Configure essa variável nas Variables do serviço no Railway — ver docs/deploy-railway.md." >&2
		exit 1
		;;
esac
