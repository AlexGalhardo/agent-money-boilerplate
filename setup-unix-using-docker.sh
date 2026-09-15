#!/usr/bin/env bash
# Bootstrap local via Docker + Docker Compose (Linux/macOS) — builda e sobe
# os 3 serviços do monorepo (api, frontend, bot) em containers. Sem Docker,
# veja ./setup-unix-using-pm2.sh. No Windows, veja
# ./setup-windows-using-docker.sh.
#
# Uso:
#   ./setup-unix-using-docker.sh            # pergunta o banco (padrão SQLite)
#   ./setup-unix-using-docker.sh sqlite     # sem perguntar
#   ./setup-unix-using-docker.sh postgres   # sem perguntar

set -e
cd "$(dirname "$0")"
source scripts/common.sh

check_docker
prompt_database_choice "$1"

if [ "$DB_CHOICE" = "postgres" ]; then
	COMPOSE_ARGS=()
	PROVIDER="postgresql"
	API_DATABASE_URL="postgresql://elysia:elysia@localhost:5432/elysia_financas"
	BOT_DATABASE_URL="postgresql://elysia:elysia@localhost:5432/elysia_financas"
else
	COMPOSE_ARGS=(-f docker-compose.sqlite.yml)
	PROVIDER="sqlite"
	API_DATABASE_URL="file:./dev.db"
	BOT_DATABASE_URL="file:../api/dev.db"
fi

# DATABASE_PROVIDER/DATABASE_URL dentro dos containers vêm do
# `environment:` de cada docker-compose*.yml (sobrepõe o que estiver no
# .env) — os valores gravados aqui são só para consistência de quem também
# rodar `bun run api:dev`/`bun run bot:dev` fora do Docker depois.
write_api_env "$PROVIDER" "$API_DATABASE_URL"
write_bot_env "$PROVIDER" "$BOT_DATABASE_URL"

prompt_test_mode_choice
write_abacatepay_env "$TEST_MODE_CHOICE"

echo "==> Buildando e subindo containers (docker compose ${COMPOSE_ARGS[*]} up -d --build)"
docker compose "${COMPOSE_ARGS[@]}" up -d --build

echo "==> Aguardando a API terminar migrations + Prisma Client (entrypoint do container)"
if wait_for_http "http://localhost:4000/docs" 30; then
	echo "==> Populando banco de dados (admin@gmail.com / adminBR@123 + aleexgvieira@gmail.com / galhardyn)"
	docker compose "${COMPOSE_ARGS[@]}" exec -T api bun run db:seed
else
	echo "A API não respondeu a tempo. Confira os logs (docker compose ${COMPOSE_ARGS[*]} logs api) e, se tudo estiver ok, rode manualmente:" >&2
	echo "  docker compose ${COMPOSE_ARGS[*]} exec api bun run db:seed" >&2
fi

echo ""
echo "Setup concluído."
echo "  API:      http://localhost:4000 (docs em /docs)"
echo "  Frontend: http://localhost:4001"
if [ "$PROVIDER" = "sqlite" ]; then
	print_prisma_studio_hint "docker-sqlite" "${COMPOSE_ARGS[*]}"
else
	print_prisma_studio_hint
fi
print_bot_hint
echo ""
echo "O container do bot sobe junto, mas fica reiniciando até TELEGRAM_BOT_TOKEN"
echo "(e as demais variáveis do bot) serem preenchidos em bot/.env — depois de"
echo "editar, rode: docker compose ${COMPOSE_ARGS[*]} restart bot"
echo ""
echo "3 serviços no Docker: api, frontend, bot"
echo ""
echo "Comandos úteis:"
echo "  docker compose ${COMPOSE_ARGS[*]} logs -f      # logs em tempo real dos 3 serviços"
echo "  docker compose ${COMPOSE_ARGS[*]} ps"
echo "  docker compose ${COMPOSE_ARGS[*]} down"
