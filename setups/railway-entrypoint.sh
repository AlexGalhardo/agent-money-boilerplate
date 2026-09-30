#!/bin/sh
# Dispatches the 3 Railway services (backend, frontend, bot) from the SAME
# image — see docs/deploy/railway.md for why (Railway can't pick a
# Dockerfile build target per service). Each Railway service sets
# RAILWAY_SERVICE_TARGET to choose which process this container runs.
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
		# The bot uses the Prisma Client generated in backend/prisma/generated
		# (same schema, same database as the API), so it must be generated on
		# this container's filesystem too.
		(cd backend && bunx prisma generate)
		cd bot
		exec bun run src/index.ts
		;;
	*)
		echo "RAILWAY_SERVICE_TARGET must be 'backend', 'frontend' or 'bot' (current value: '${RAILWAY_SERVICE_TARGET}'). Set it in the service's Variables on Railway — see docs/deploy/railway.md." >&2
		exit 1
		;;
esac
