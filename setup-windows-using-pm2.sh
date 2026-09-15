#!/usr/bin/env bash
# Bootstrap local via PM2 (Windows 11 + WSL2), sem Docker para os processos
# da aplicação — api, frontend e bot rodam como processos PM2 em modo watch
# (bun run dev). Rode este arquivo de dentro do WSL2 (recomendado) ou do Git
# Bash — NÃO funciona no PowerShell/cmd.exe.
#
# Se Postgres for escolhido, o único uso de Docker aqui é opcional e só
# para o banco (docker compose up -d postgres, via Docker Desktop); sem
# Docker Desktop aberto, aponte DATABASE_URL para um Postgres já rodando em
# outro lugar. Para SQLite não é preciso Docker nenhum.
#
# Uso:
#   ./setup-windows-using-pm2.sh            # pergunta o banco (padrão SQLite)
#   ./setup-windows-using-pm2.sh sqlite     # sem perguntar
#   ./setup-windows-using-pm2.sh postgres   # sem perguntar

set -e
cd "$(dirname "$0")"
source scripts/common.sh

require_bun

if ! command -v pm2 >/dev/null 2>&1; then
	echo "==> PM2 não encontrado, instalando globalmente (bun install -g pm2)"
	bun install -g pm2
fi

echo "==> Instalando dependências (bun install)"
bun install

prompt_database_choice "$1"

if [ "$DB_CHOICE" = "postgres" ]; then
	PROVIDER="postgresql"
	API_DATABASE_URL="postgresql://elysia:elysia@localhost:5432/elysia_financas"
	BOT_DATABASE_URL="postgresql://elysia:elysia@localhost:5432/elysia_financas"
	if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
		echo "==> Subindo Postgres via Docker Desktop (docker compose up -d postgres)"
		docker compose up -d postgres
	else
		echo "Docker Desktop não está rodando (ou não foi encontrado) — abra-o antes de continuar, ou suba um Postgres em localhost:5432 (usuário/senha/banco: elysia/elysia/elysia_financas) por conta própria e ajuste DATABASE_URL em api/.env e bot/.env depois deste script rodar." >&2
	fi
else
	PROVIDER="sqlite"
	API_DATABASE_URL="file:./dev.db"
	BOT_DATABASE_URL="file:../api/dev.db"
fi

write_api_env "$PROVIDER" "$API_DATABASE_URL"

prompt_test_mode_choice
write_abacatepay_env "$TEST_MODE_CHOICE"

echo "==> Aplicando migrations e gerando o Prisma Client"
if [ "$PROVIDER" = "postgresql" ]; then
	(cd api && bun run db:deploy:postgres && bun run db:generate:postgres)
else
	(cd api && bun run db:deploy && bun run db:generate)
fi

echo "==> Populando banco (admin@gmail.com / adminBR@123 + aleexgvieira@gmail.com / galhardyn)"
(cd api && bun run db:seed)

write_bot_env "$PROVIDER" "$BOT_DATABASE_URL"

echo "==> Subindo api + frontend com PM2 (ecosystem.local.config.js)"
pm2 start ecosystem.local.config.js --only elysia-api,elysia-frontend

if bot_is_configured; then
	echo "==> bot/.env já configurado, subindo elysia-bot também"
	pm2 start ecosystem.local.config.js --only elysia-bot
else
	print_bot_hint
	echo "Depois de configurar: pm2 start ecosystem.local.config.js --only elysia-bot"
fi

pm2 save >/dev/null

echo ""
echo "Setup concluído."
echo "  API:      http://localhost:4000 (docs em /docs)"
echo "  Frontend: http://localhost:4001"
print_prisma_studio_hint
echo ""
echo "3 serviços no PM2: elysia-api, elysia-frontend, elysia-bot"
echo "  (elysia-bot só sobe de fato depois de bot/.env configurado — ver acima)"
echo ""
echo "Comandos úteis:"
echo "  pm2 status"
echo "  pm2 logs                            # logs em tempo real dos 3 serviços"
echo "  pm2 restart ecosystem.local.config.js"
echo "  pm2 delete ecosystem.local.config.js"
