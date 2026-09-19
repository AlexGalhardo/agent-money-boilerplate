#!/usr/bin/env bash
# Bootstrap local via Docker Desktop (Windows 11 + WSL2) — builda e sobe os
# 3 serviços do monorepo (backend, frontend, bot) em containers. Rode este
# arquivo de dentro do WSL2 (recomendado) ou do Git Bash — NÃO funciona no
# PowerShell/cmd.exe. Sem Docker, veja ./setup-windows-using-pm2.sh.
#
# Pré-requisito: Docker Desktop instalado e aberto, com a integração WSL2
# habilitada (Settings > Resources > WSL Integration), e este repositório
# clonado dentro do filesystem do WSL2 (ex: ~/code/..., não /mnt/c/...) para
# builds rápidos — ver https://docs.docker.com/desktop/wsl/.
#
# Uso:
#   ./setup-windows-using-docker.sh            # pergunta o banco (padrão SQLite)
#   ./setup-windows-using-docker.sh sqlite     # sem perguntar
#   ./setup-windows-using-docker.sh postgres   # sem perguntar

set -e
cd "$(dirname "$0")"
source scripts/common.sh

check_docker_desktop_windows
prompt_database_choice "$1"

if [ "$DB_CHOICE" = "postgres" ]; then
	COMPOSE_ARGS=()
	PROVIDER="postgresql"
	API_DATABASE_URL="postgresql://elysia:elysia@localhost:5432/elysia_financas"
	BOT_DATABASE_URL="postgresql://elysia:elysia@localhost:5432/elysia_financas"
	free_app_ports 4000 4001 5432
else
	COMPOSE_ARGS=(-f docker-compose.sqlite.yml)
	PROVIDER="sqlite"
	API_DATABASE_URL="file:./dev.db"
	BOT_DATABASE_URL="file:../backend/dev.db"
	free_app_ports 4000 4001
fi

# DATABASE_PROVIDER/DATABASE_URL dentro dos containers vêm do
# `environment:` de cada docker-compose*.yml (sobrepõe o que estiver no
# .env) — os valores gravados aqui são só para consistência de quem também
# rodar `bun run backend:dev`/`bun run bot:dev` fora do Docker depois.
write_api_env "$PROVIDER" "$API_DATABASE_URL"
write_bot_env "$PROVIDER" "$BOT_DATABASE_URL"

prompt_test_mode_choice
write_abacatepay_env "$TEST_MODE_CHOICE"

# Sem "-d": os containers sobem anexados a este terminal (não em background)
# e os logs dos 3 serviços já começam a aparecer aqui embaixo imediatamente.
# `wait $COMPOSE_PID` no fim re-anexa o script a esse processo — Ctrl+C mata
# o `docker compose up`, que por sua vez para os containers (trap abaixo).
echo "==> Buildando e subindo containers (docker compose ${COMPOSE_ARGS[*]} up --build)"
docker compose "${COMPOSE_ARGS[@]}" up --build &
COMPOSE_PID=$!
trap 'echo ""; echo "==> Encerrando containers..."; kill "$COMPOSE_PID" 2>/dev/null; wait "$COMPOSE_PID" 2>/dev/null' INT TERM

echo "==> Aguardando a API terminar migrations + Prisma Client (entrypoint do container)"
if wait_for_http "http://localhost:4000/docs" 30; then
	echo "==> Populando banco de dados (admin@gmail.com / adminBR@123 + aleexgvieira@gmail.com / galhardyn)"
	docker compose "${COMPOSE_ARGS[@]}" exec -T backend bun run db:seed
else
	echo "A API não respondeu a tempo. Confira os logs acima e, se tudo estiver ok, rode manualmente:" >&2
	echo "  docker compose ${COMPOSE_ARGS[*]} exec backend bun run db:seed" >&2
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
echo "editar, rode (em outro terminal): docker compose ${COMPOSE_ARGS[*]} restart bot"
echo ""
echo "3 serviços no Docker: backend, frontend, bot — logs em tempo real abaixo."
echo "Ctrl+C encerra os 3 containers. Pra editar bot/.env, abra outro terminal."
echo ""

wait "$COMPOSE_PID" || true
