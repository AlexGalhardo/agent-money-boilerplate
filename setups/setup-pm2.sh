#!/usr/bin/env bash
# Local bootstrap without Docker for the apps — backend, frontend and bot run
# as PM2 processes in watch mode (bun run dev). Linux, macOS, or Windows 11
# from a WSL2 / Git Bash terminal (not PowerShell/cmd). With Postgres, Docker
# is used only for the database container when available; otherwise point
# DATABASE_URL at a Postgres you run yourself. With Docker, see
# ./setups/setup-docker.sh.
#
# Usage:
#   ./setups/setup-pm2.sh            # asks for the database (default SQLite)
#   ./setups/setup-pm2.sh sqlite     # no prompt
#   ./setups/setup-pm2.sh postgres   # no prompt

set -e
cd "$(dirname "$0")/.."
source scripts/common.sh

require_bun

if ! command -v pm2 >/dev/null 2>&1; then
	echo "==> PM2 not found, installing it globally (bun install -g pm2)"
	bun install -g pm2
fi

echo "==> Installing dependencies (bun install)"
bun install

prompt_database_choice "$1"
free_app_ports 4000 4001

if [ "$DB_CHOICE" = "postgres" ]; then
	PROVIDER="postgresql"
	API_DATABASE_URL="postgresql://elysia:elysia@localhost:5432/elysia_financas"
	BOT_DATABASE_URL="$API_DATABASE_URL"
	if docker_available; then
		free_app_ports 5432
		echo "==> Starting Postgres with Docker Compose"
		docker compose -f infra/docker-compose.yml --project-directory . up -d postgres
	else
		echo "Docker isn't available — start a Postgres on localhost:5432 (user/password/db: elysia/elysia/elysia_financas) yourself, or adjust DATABASE_URL in backend/.env and bot/.env after this script." >&2
	fi
else
	PROVIDER="sqlite"
	API_DATABASE_URL="file:./dev.db"
	BOT_DATABASE_URL="file:../backend/dev.db"
fi

write_api_env "$PROVIDER" "$API_DATABASE_URL"

prompt_payment_mode
write_abacatepay_env "$PAYMENT_MODE"

echo "==> Applying migrations and generating the Prisma Client"
if [ "$PROVIDER" = "postgresql" ]; then
	(cd backend && bun run db:deploy:postgres && bun run db:generate:postgres)
else
	(cd backend && bun run db:deploy && bun run db:generate)
fi

echo "==> Seeding the database (admin@gmail.com / adminBR@123)"
(cd backend && bun run db:seed)

write_bot_env "$PROVIDER" "$BOT_DATABASE_URL"

PM2_APPS="elysia-backend,elysia-frontend"
if bot_is_configured; then
	echo "==> bot/.env is configured — elysia-bot starts too"
	PM2_APPS="elysia-backend,elysia-frontend,elysia-bot"
else
	print_bot_hint
	echo "elysia-bot won't start now — configure bot/.env and run this script again."
fi

echo ""
echo "Setup complete."
echo "  API:      http://localhost:4000"
echo "  Frontend: http://localhost:4001"
print_prisma_studio_hint
echo ""
echo "==> Starting $PM2_APPS with pm2-runtime (foreground — Ctrl+C stops all)"
echo ""

exec bunx pm2-runtime start infra/ecosystem.local.config.js --only "$PM2_APPS"
