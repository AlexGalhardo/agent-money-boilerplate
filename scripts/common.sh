# Funções compartilhadas pelos 4 scripts de bootstrap da raiz
# (setup-unix-using-docker.sh, setup-unix-using-pm2.sh,
# setup-windows-using-docker.sh, setup-windows-using-pm2.sh).
# Não é executável sozinho — é sempre `source`d por eles.

require_bun() {
	if ! command -v bun >/dev/null 2>&1; then
		echo "Bun não encontrado. Instale em https://bun.sh antes de continuar." >&2
		exit 1
	fi
}

check_docker() {
	if ! command -v docker >/dev/null 2>&1; then
		echo "Docker não encontrado. Instale em https://docs.docker.com/get-docker/ antes de continuar." >&2
		exit 1
	fi
	if ! docker info >/dev/null 2>&1; then
		echo "Docker instalado, mas o daemon não está rodando. Inicie o Docker e tente de novo." >&2
		exit 1
	fi
}

check_docker_desktop_windows() {
	if ! command -v docker >/dev/null 2>&1; then
		echo "Docker não encontrado. Instale o Docker Desktop (https://www.docker.com/products/docker-desktop/), habilite a integração com o WSL2 nas configurações e reabra este terminal antes de continuar." >&2
		exit 1
	fi
	if ! docker info >/dev/null 2>&1; then
		echo "Docker Desktop parece não estar rodando. Abra o Docker Desktop, espere o ícone da baleia terminar de iniciar e rode este script de novo." >&2
		exit 1
	fi
}

# openssl vem com o Git for Windows e com o WSL/Linux/macOS, mas na dúvida
# caímos para o crypto do Node embutido no Bun (dependência já obrigatória
# deste projeto) em vez de falhar o setup.
generate_hex32() {
	if command -v openssl >/dev/null 2>&1; then
		openssl rand -hex 32
	else
		bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
	fi
}

# Troca em-place funcionando igual em GNU sed (Linux, WSL, Git Bash) e BSD
# sed (macOS): passar uma extensão de backup (mesmo vazia) depois de -i é a
# única sintaxe aceita pelos dois — por isso sempre criamos e removemos um
# ".bak" em vez de tentar detectar o sistema operacional.
replace_in_file() {
	local pattern="$1"
	local file="$2"
	sed -i.bak "$pattern" "$file"
	rm -f "$file.bak"
}

# Pergunta interativamente qual banco usar. Se $1 já vier preenchido com
# "sqlite" ou "postgres" (argumento de linha de comando do script chamador),
# pula o prompt — mantém compatibilidade com o antigo `./setup.sh postgres`.
# Sem terminal interativo (ex: rodando em CI), assume SQLite.
prompt_database_choice() {
	local preset="$1"
	if [ "$preset" = "sqlite" ] || [ "$preset" = "postgres" ]; then
		DB_CHOICE="$preset"
		return
	fi
	if [ ! -t 0 ]; then
		DB_CHOICE="sqlite"
		return
	fi
	echo ""
	echo "Qual banco de dados você quer usar?"
	echo "  a) SQLite   (configuração rápida, padrão)"
	echo "  b) Postgres"
	read -r -p "Escolha [a]: " answer
	case "$answer" in
	b | B | postgres | Postgres) DB_CHOICE="postgres" ;;
	*) DB_CHOICE="sqlite" ;;
	esac
}

# Cria backend/.env a partir do .env.example na primeira vez (gerando
# BETTER_AUTH_SECRET/ENCRYPTION_KEY) e, se $2 (database_url) vier preenchido,
# sobrescreve DATABASE_PROVIDER/DATABASE_URL sempre — mesmo em runs
# seguintes — para permitir trocar de banco sem apagar o .env manualmente.
write_api_env() {
	local provider="$1"
	local database_url="$2"

	if [ ! -f backend/.env ]; then
		echo "==> Criando backend/.env a partir de backend/.env.example"
		cp backend/.env.example backend/.env
		replace_in_file "s/^BETTER_AUTH_SECRET=.*/BETTER_AUTH_SECRET=$(generate_hex32)/" backend/.env
		replace_in_file "s/^ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$(generate_hex32)/" backend/.env
	else
		echo "==> backend/.env já existe, mantendo segredos e demais variáveis como estão"
	fi

	if [ -n "$database_url" ]; then
		replace_in_file "s#^DATABASE_PROVIDER=.*#DATABASE_PROVIDER=$provider#" backend/.env
		replace_in_file "s#^DATABASE_URL=.*#DATABASE_URL=$database_url#" backend/.env
	fi
}

# Espelha os segredos e a config de banco de backend/.env em bot/.env (mesmo
# banco, mesma chave de criptografia — ver CLAUDE.md). Variáveis específicas
# do bot (TELEGRAM_*, BOT_PASSWORD_HASH_BASE64) ficam como estiverem — o
# usuário preenche manualmente, o bot é opcional.
write_bot_env() {
	local provider="$1"
	local database_url="$2"

	if [ ! -f bot/.env ]; then
		echo "==> Criando bot/.env a partir de bot/.env.example"
		cp bot/.env.example bot/.env
	else
		echo "==> bot/.env já existe, mantendo como está (segredos e banco serão sincronizados)"
	fi

	local better_auth_secret
	local encryption_key
	better_auth_secret=$(grep "^BETTER_AUTH_SECRET=" backend/.env | cut -d= -f2-)
	encryption_key=$(grep "^ENCRYPTION_KEY=" backend/.env | cut -d= -f2-)

	replace_in_file "s#^BETTER_AUTH_SECRET=.*#BETTER_AUTH_SECRET=$better_auth_secret#" bot/.env
	replace_in_file "s#^ENCRYPTION_KEY=.*#ENCRYPTION_KEY=$encryption_key#" bot/.env
	replace_in_file "s#^DATABASE_PROVIDER=.*#DATABASE_PROVIDER=$provider#" bot/.env
	replace_in_file "s#^DATABASE_URL=.*#DATABASE_URL=$database_url#" bot/.env
}

# Pergunta se a API deve subir com o fluxo de pagamento PIX (AbacatePay) em
# TESTE_MODE (sem chaves reais, com o botão "Pagar PIX Teste Mode") ou não
# (chaves de desenvolvimento da AbacatePay, para testar o fluxo de PIX de
# verdade localmente). Sem terminal interativo (ex: CI), assume modo teste.
prompt_test_mode_choice() {
	if [ ! -t 0 ]; then
		TEST_MODE_CHOICE="teste"
		return
	fi
	echo ""
	echo "Subir o pagamento via PIX (AbacatePay) em modo TESTE?"
	echo "  a) Sim, TESTE_MODE (padrão — sem chaves reais, com botão de simular PIX)"
	echo "  b) Não, usar chaves de desenvolvimento da AbacatePay (fluxo de PIX real, para testar localmente)"
	read -r -p "Escolha [a]: " answer
	case "$answer" in
	b | B | nao | não | Nao | Não) TEST_MODE_CHOICE="real" ;;
	*) TEST_MODE_CHOICE="teste" ;;
	esac
}

# Grava em backend/.env as variáveis do AbacatePay conforme a escolha de
# prompt_test_mode_choice. No modo "real", usa as chaves de desenvolvimento
# combinadas com quem pediu este setup — permitem exercitar o fluxo de PIX
# de verdade (sandbox da própria AbacatePay) em vez do botão de simulação.
write_abacatepay_env() {
	local choice="$1"

	if [ "$choice" = "real" ]; then
		replace_in_file "s#^ENABLE_ABACATEPAY=.*#ENABLE_ABACATEPAY=true#" backend/.env
		replace_in_file "s#^ABACATEPAY_API_KEY=.*#ABACATEPAY_API_KEY=abc_dev_mwae6mwTjzuZD5R0ApWRAWmB#" backend/.env
		replace_in_file "s#^ABACATEPAY_WEBHOOK_SECRET=.*#ABACATEPAY_WEBHOOK_SECRET=CEF9B8447FF29F1E0B2C260406AF00B6#" backend/.env
		replace_in_file "s#^ABACATEPAY_PIX_TEST_MODE=.*#ABACATEPAY_PIX_TEST_MODE=false#" backend/.env
		echo "==> AbacatePay configurado com chaves de desenvolvimento (fluxo de PIX real, não simulado)."
		echo "    Webhook: \${APP_URL}/webhook/abacatepay?webhookSecret=CEF9B8447FF29F1E0B2C260406AF00B6"
	else
		replace_in_file "s#^ENABLE_ABACATEPAY=.*#ENABLE_ABACATEPAY=false#" backend/.env
		replace_in_file "s#^ABACATEPAY_PIX_TEST_MODE=.*#ABACATEPAY_PIX_TEST_MODE=true#" backend/.env
		echo "==> AbacatePay em modo teste (sem chaves reais)."
	fi
}

bot_is_configured() {
	[ -f bot/.env ] && grep -Eq "^TELEGRAM_BOT_TOKEN=.+" bot/.env
}

print_bot_hint() {
	echo ""
	echo "Bot do Telegram (opcional): edite bot/.env com TELEGRAM_BOT_TOKEN e"
	echo "BOT_PASSWORD_HASH_BASE64 (gere com"
	echo "\`cd bot && bun run hash-password \"sua-senha\"\`)."
	echo "Veja docs/telegram-bot.md para o passo a passo completo (o bot é"
	echo "multi-tenant: cada chat se vincula à própria conta enviando o ID dela,"
	echo "sem allowlist de chat fixo)."
}

# Prisma Studio não sobe junto com o resto — é uma UI opcional para
# inspecionar/editar dados direto no banco, iniciada sob demanda.
#
# No Docker com SQLite, o banco fica num volume nomeado (só visível de
# dentro do container) — por isso o Studio precisa rodar lá também, não no
# host. Nos demais casos (PM2, ou Docker com Postgres exposto em
# localhost:5432), `bun run db:studio` no host já funciona direto.
print_prisma_studio_hint() {
	local mode="$1" # "local" (padrão) ou "docker-sqlite"
	local compose_args="$2"

	if [ "$mode" = "docker-sqlite" ]; then
		echo "  Prisma Studio: docker compose ${compose_args} exec backend bunx prisma studio --port 5555 --hostname 0.0.0.0"
		echo "                 (rode num terminal separado, depois abra http://localhost:5555)"
	else
		echo "  Prisma Studio: cd backend && bun run db:studio   (abre em http://localhost:5555)"
	fi
}

# Mata o(s) processo(s) escutando numa porta TCP — cobre tanto Unix/WSL2
# (lsof, ou fuser como fallback) quanto Git Bash no Windows (netstat.exe +
# taskkill.exe nativos, sem depender de nenhuma ferramenta extra instalada).
# Sempre loga o que encontrou/matou, mesmo quando não há nada pra fazer.
kill_process_on_port() {
	local port="$1"
	local pids=""

	if command -v lsof >/dev/null 2>&1; then
		pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
	elif command -v fuser >/dev/null 2>&1; then
		pids=$(fuser "${port}/tcp" 2>/dev/null || true)
	elif command -v netstat >/dev/null 2>&1; then
		# Saída do netstat.exe do Windows: "  TCP    0.0.0.0:4000     0.0.0.0:0    LISTENING    12345"
		pids=$(netstat -ano -p tcp 2>/dev/null |
			grep -i "LISTENING" |
			awk -v p=":$port$" '$2 ~ p {print $NF}' |
			sort -u)
	fi

	if [ -z "$pids" ]; then
		echo "    Porta ${port}: livre"
		return
	fi

	echo "    Porta ${port}: em uso pelo(s) PID $(echo "$pids" | tr '\n' ' ')— encerrando"
	for pid in $pids; do
		if command -v taskkill >/dev/null 2>&1; then
			taskkill //F //PID "$pid" >/dev/null 2>&1 || true
		else
			kill -9 "$pid" 2>/dev/null || true
		fi
	done
}

# Garante que as portas usadas pelos serviços da aplicação (4000 API, 4001
# frontend, e opcionalmente 5432 do Postgres) estejam livres antes de subir
# tudo de novo — mata processos PM2 antigos com os mesmos nomes, para/remove
# containers Docker (de qualquer stack) publicando essas portas, e por fim
# qualquer processo solto (ex: um `bun run dev` que ficou pra trás) ainda
# escutando nelas. Sempre explícito nos logs sobre o que foi encontrado e
# encerrado, pra facilitar debug de "porta já em uso".
free_app_ports() {
	local ports=("$@")
	echo "==> Garantindo que as portas ${ports[*]} estão livres"

	if command -v pm2 >/dev/null 2>&1 && pm2 jlist 2>/dev/null | grep -q '"name":"elysia-'; then
		echo "    Processos elysia-* antigos rodando no PM2 — removendo (pm2 delete)"
		pm2 delete elysia-backend elysia-frontend elysia-bot >/dev/null 2>&1 || true
	fi

	if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
		for port in "${ports[@]}"; do
			local containers
			containers=$(docker ps -q --filter "publish=${port}" 2>/dev/null || true)
			if [ -n "$containers" ]; then
				local names
				names=$(docker ps --filter "publish=${port}" --format '{{.Names}}' | tr '\n' ' ')
				echo "    Porta ${port}: em uso por container(s) Docker ($names) — parando"
				docker stop $containers >/dev/null
			fi
		done
	fi

	for port in "${ports[@]}"; do
		kill_process_on_port "$port"
	done
}

# Espera um endpoint HTTP responder antes de seguir (usado para aguardar o
# container da API terminar migrations + Prisma generate no entrypoint antes
# de rodar o seed). Sem curl disponível, desiste na hora — quem chamar trata
# o retorno diferente de 0 avisando para rodar o passo manualmente.
wait_for_http() {
	local url="$1"
	local tries="${2:-30}"
	local i=0
	if ! command -v curl >/dev/null 2>&1; then
		return 1
	fi
	while [ "$i" -lt "$tries" ]; do
		if curl -fsS -o /dev/null "$url"; then
			return 0
		fi
		i=$((i + 1))
		sleep 2
	done
	return 1
}
