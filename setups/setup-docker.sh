#!/usr/bin/env bash
# Local bootstrap with Docker Compose — builds and starts the backend,
# frontend and bot containers. Linux, macOS, or Windows 11 from a WSL2 / Git
# Bash terminal (not PowerShell/cmd). Without Docker, see ./setups/setup-pm2.sh.
#
# Usage:
#   ./setups/setup-docker.sh            # asks for the database (default SQLite)
#   ./setups/setup-docker.sh sqlite     # no prompt
#   ./setups/setup-docker.sh postgres   # no prompt

set -e
cd "$(dirname "$0")/.."
source scripts/common.sh

check_docker
prompt_database_choice "$1"

if [ "$DB_CHOICE" = "postgres" ]; then
	COMPOSE_ARGS=(-f infra/docker-compose.yml --project-directory .)
	PROVIDER="postgresql"
	API_DATABASE_URL="postgresql://elysia:elysia@localhost:5432/elysia_financas"
	BOT_DATABASE_URL="$API_DATABASE_URL"
	free_app_ports 4000 4001 5432
else
	COMPOSE_ARGS=(-f infra/docker-compose.sqlite.yml --project-directory .)
	PROVIDER="sqlite"
	API_DATABASE_URL="file:./dev.db"
	BOT_DATABASE_URL="file:../backend/dev.db"
	free_app_ports 4000 4001
fi

# Inside the containers DATABASE_* come from each compose file's
# `environment:` (overriding .env); writing them here keeps the .env files
# consistent for anyone who later runs the apps outside Docker.
write_api_env "$PROVIDER" "$API_DATABASE_URL"
write_bot_env "$PROVIDER" "$BOT_DATABASE_URL"

prompt_payment_mode
write_abacatepay_env "$PAYMENT_MODE"

# No "-d": containers stay attached so their logs stream here; Ctrl+C stops
# `docker compose up`, which stops the containers (trap below).
echo "==> Building and starting containers (docker compose ${COMPOSE_ARGS[*]} up --build)"
docker compose "${COMPOSE_ARGS[@]}" up --build &
COMPOSE_PID=$!
trap 'echo ""; echo "==> Stopping containers..."; kill "$COMPOSE_PID" 2>/dev/null; wait "$COMPOSE_PID" 2>/dev/null' INT TERM

echo "==> Waiting for the API (the container applies migrations + generates the Prisma Client first)"
if wait_for_http "http://localhost:4000/" 60; then
	echo "==> Seeding the database (admin@gmail.com / adminBR@123)"
	docker compose "${COMPOSE_ARGS[@]}" exec -T backend bun run db:seed
else
	echo "The API didn't answer in time. Check the logs above; if all is well, seed manually:" >&2
	echo "  docker compose ${COMPOSE_ARGS[*]} exec backend bun run db:seed" >&2
fi

echo ""
echo "Setup complete."
echo "  API:      http://localhost:4000"
echo "  Frontend: http://localhost:4001"
if [ "$PROVIDER" = "sqlite" ]; then
	print_prisma_studio_hint "docker-sqlite" "${COMPOSE_ARGS[*]}"
else
	print_prisma_studio_hint
fi
print_bot_hint
echo ""
echo "The bot container keeps restarting until bot/.env is configured — then run"
echo "(in another terminal): docker compose ${COMPOSE_ARGS[*]} restart bot"
echo ""
echo "Streaming logs of backend, frontend and bot below. Ctrl+C stops all three."
echo ""

wait "$COMPOSE_PID" || true
