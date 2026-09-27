# Functions shared by setups/setup-docker.sh and setups/setup-pm2.sh.
# Not executable on its own — always `source`d.

# WSL2 or Git Bash on Windows — only changes error messages (Docker Desktop
# vs a native Docker daemon), the setup itself is identical.
is_windows_host() {
	grep -qi microsoft /proc/version 2>/dev/null && return 0
	case "$(uname -s)" in
	MINGW* | MSYS* | CYGWIN*) return 0 ;;
	esac
	return 1
}

require_bun() {
	if ! command -v bun >/dev/null 2>&1; then
		echo "Bun not found. Install it from https://bun.sh before continuing." >&2
		exit 1
	fi
}

check_docker() {
	if ! command -v docker >/dev/null 2>&1; then
		if is_windows_host; then
			echo "Docker not found. Install Docker Desktop (https://www.docker.com/products/docker-desktop/), enable WSL2 integration in its settings and reopen this terminal." >&2
		else
			echo "Docker not found. Install it from https://docs.docker.com/get-docker/ before continuing." >&2
		fi
		exit 1
	fi
	if ! docker info >/dev/null 2>&1; then
		if is_windows_host; then
			echo "Docker Desktop doesn't seem to be running. Open it, wait for the whale icon to finish starting and run this script again." >&2
		else
			echo "Docker is installed but the daemon isn't running. Start Docker and try again." >&2
		fi
		exit 1
	fi
}

docker_available() {
	command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

# openssl ships with Git for Windows, WSL, Linux and macOS; fall back to
# Bun's built-in crypto (Bun is already required) instead of failing.
generate_hex32() {
	if command -v openssl >/dev/null 2>&1; then
		openssl rand -hex 32
	else
		bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
	fi
}

# In-place edit that works the same with GNU sed (Linux, WSL, Git Bash) and
# BSD sed (macOS): a backup extension right after -i is the only syntax both
# accept, so always create and delete a ".bak" instead of detecting the OS.
replace_in_file() {
	local pattern="$1"
	local file="$2"
	sed -i.bak "$pattern" "$file"
	rm -f "$file.bak"
}

# Asks which database to use. A preset "sqlite"/"postgres" (the calling
# script's first argument) skips the prompt; without an interactive terminal
# (CI) it defaults to SQLite.
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
	echo "Which database do you want to use?"
	echo "  a) SQLite   (quick setup, default)"
	echo "  b) Postgres"
	read -r -p "Choice [a]: " answer
	case "$answer" in
	b | B | postgres | Postgres) DB_CHOICE="postgres" ;;
	*) DB_CHOICE="sqlite" ;;
	esac
}

# Creates backend/.env from .env.example the first time (generating
# BETTER_AUTH_SECRET/ENCRYPTION_KEY). DATABASE_PROVIDER/DATABASE_URL are
# rewritten on every run so switching databases doesn't require deleting
# the .env by hand.
write_api_env() {
	local provider="$1"
	local database_url="$2"

	if [ ! -f backend/.env ]; then
		echo "==> Creating backend/.env from backend/.env.example"
		cp backend/.env.example backend/.env
		replace_in_file "s/^BETTER_AUTH_SECRET=.*/BETTER_AUTH_SECRET=$(generate_hex32)/" backend/.env
		replace_in_file "s/^ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$(generate_hex32)/" backend/.env
	else
		echo "==> backend/.env already exists — keeping its secrets and variables"
	fi

	if [ -n "$database_url" ]; then
		replace_in_file "s#^DATABASE_PROVIDER=.*#DATABASE_PROVIDER=$provider#" backend/.env
		replace_in_file "s#^DATABASE_URL=.*#DATABASE_URL=$database_url#" backend/.env
	fi
}

# Mirrors backend/.env's secrets and database into bot/.env (same database,
# same encryption key). Bot-only variables (TELEGRAM_*, BOT_PASSWORD_*) are
# left alone — the bot is optional and filled in by hand.
write_bot_env() {
	local provider="$1"
	local database_url="$2"

	if [ ! -f bot/.env ]; then
		echo "==> Creating bot/.env from bot/.env.example"
		cp bot/.env.example bot/.env
	else
		echo "==> bot/.env already exists — syncing only secrets and database"
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

# PIX payments: test mode (no keys, "Pay PIX Test Mode" button) or your own
# AbacatePay dev keys (real sandbox flow). Non-interactive runs use test mode.
prompt_payment_mode() {
	if [ ! -t 0 ]; then
		PAYMENT_MODE="test"
		return
	fi
	echo ""
	echo "Run PIX payments (AbacatePay) in TEST mode?"
	echo "  a) Yes (default — no keys needed, a button simulates the payment)"
	echo "  b) No, use my AbacatePay dev keys (real sandbox flow)"
	read -r -p "Choice [a]: " answer
	case "$answer" in
	b | B | no | No) PAYMENT_MODE="sandbox" ;;
	*) PAYMENT_MODE="test" ;;
	esac
}

# Keys are typed in, never stored in this repository (a dev key that used to
# be hardcoded here is listed in docs/security.md as compromised).
write_abacatepay_env() {
	local mode="$1"

	if [ "$mode" = "sandbox" ]; then
		local api_key webhook_secret
		read -r -s -p "AbacatePay dev API key: " api_key
		echo ""
		webhook_secret=$(generate_hex32)
		replace_in_file "s#^ENABLE_ABACATEPAY=.*#ENABLE_ABACATEPAY=true#" backend/.env
		replace_in_file "s#^ABACATEPAY_API_KEY=.*#ABACATEPAY_API_KEY=$api_key#" backend/.env
		replace_in_file "s#^ABACATEPAY_WEBHOOK_SECRET=.*#ABACATEPAY_WEBHOOK_SECRET=$webhook_secret#" backend/.env
		replace_in_file "s#^ABACATEPAY_PIX_TEST_MODE=.*#ABACATEPAY_PIX_TEST_MODE=false#" backend/.env
		echo "==> AbacatePay configured with your dev key. Register the webhook as:"
		echo "    \${APP_URL}/webhook/abacatepay?webhookSecret=<ABACATEPAY_WEBHOOK_SECRET from backend/.env>"
	else
		replace_in_file "s#^ENABLE_ABACATEPAY=.*#ENABLE_ABACATEPAY=false#" backend/.env
		replace_in_file "s#^ABACATEPAY_PIX_TEST_MODE=.*#ABACATEPAY_PIX_TEST_MODE=true#" backend/.env
		echo "==> AbacatePay in test mode (no real keys)."
	fi
}

bot_is_configured() {
	[ -f bot/.env ] && grep -Eq "^TELEGRAM_BOT_TOKEN=.+" bot/.env && ! grep -q "^TELEGRAM_BOT_TOKEN=<" bot/.env
}

print_bot_hint() {
	echo ""
	echo "Telegram bot (optional): set TELEGRAM_BOT_TOKEN and BOT_PASSWORD_HASH_BASE64"
	echo "in bot/.env (generate the hash with \`cd bot && bun run hash-password \"your-password\"\`)."
	echo "The bot is multi-tenant: each chat links to its own account by logging in"
	echo "from the chat. See docs/deploy/local-setup.md."
}

# Prisma Studio is an on-demand UI, not started with the rest. With Docker +
# SQLite the database lives in a named volume (only visible inside the
# container), so Studio must run there; otherwise the host command works.
print_prisma_studio_hint() {
	local mode="$1" # "local" (default) or "docker-sqlite"
	local compose_args="$2"

	if [ "$mode" = "docker-sqlite" ]; then
		echo "  Prisma Studio: docker compose ${compose_args} exec backend bunx prisma studio --port 5555 --hostname 0.0.0.0"
		echo "                 (in another terminal, then open http://localhost:5555)"
	else
		echo "  Prisma Studio: cd backend && bun run db:studio   (opens http://localhost:5555)"
	fi
}

# Kills whatever listens on a TCP port — Unix/WSL2 (lsof, fuser) and Git
# Bash on Windows (native netstat.exe + taskkill.exe). Always logs.
kill_process_on_port() {
	local port="$1"
	local pids=""

	if command -v lsof >/dev/null 2>&1; then
		pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
	elif command -v fuser >/dev/null 2>&1; then
		pids=$(fuser "${port}/tcp" 2>/dev/null || true)
	elif command -v netstat >/dev/null 2>&1; then
		# Windows netstat.exe output: "  TCP    0.0.0.0:4000     0.0.0.0:0    LISTENING    12345"
		pids=$(netstat -ano -p tcp 2>/dev/null |
			grep -i "LISTENING" |
			awk -v p=":$port$" '$2 ~ p {print $NF}' |
			sort -u)
	fi

	if [ -z "$pids" ]; then
		echo "    Port ${port}: free"
		return
	fi

	echo "    Port ${port}: used by PID $(echo "$pids" | tr '\n' ' ')— stopping"
	for pid in $pids; do
		if command -v taskkill >/dev/null 2>&1; then
			taskkill //F //PID "$pid" >/dev/null 2>&1 || true
		else
			kill -9 "$pid" 2>/dev/null || true
		fi
	done
}

# Frees the app ports (4000 API, 4001 frontend, optionally 5432 Postgres):
# removes old elysia-* PM2 processes, stops Docker containers publishing
# those ports, then kills any stray process still listening.
free_app_ports() {
	local ports=("$@")
	echo "==> Making sure ports ${ports[*]} are free"

	if command -v pm2 >/dev/null 2>&1 && pm2 jlist 2>/dev/null | grep -q '"name":"elysia-'; then
		echo "    Removing old elysia-* PM2 processes"
		pm2 delete elysia-backend elysia-frontend elysia-bot >/dev/null 2>&1 || true
	fi

	if docker_available; then
		for port in "${ports[@]}"; do
			local containers
			containers=$(docker ps -q --filter "publish=${port}" 2>/dev/null || true)
			if [ -n "$containers" ]; then
				local names
				names=$(docker ps --filter "publish=${port}" --format '{{.Names}}' | tr '\n' ' ')
				echo "    Port ${port}: used by Docker container(s) ($names) — stopping"
				docker stop $containers >/dev/null
			fi
		done
	fi

	for port in "${ports[@]}"; do
		kill_process_on_port "$port"
	done
}

# Waits for an HTTP endpoint (the API container finishing migrations +
# Prisma generate) before seeding. Without curl it gives up immediately and
# the caller prints the manual command.
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
