# Local setup

Two scripts bring the whole stack up locally — pick one:

| Script                     | Runs the apps as            | Needs                                |
| -------------------------- | --------------------------- | ------------------------------------ |
| `./setups/setup-docker.sh` | Docker Compose containers   | Docker (Docker Desktop on Windows)   |
| `./setups/setup-pm2.sh`    | PM2 processes in watch mode | Bun ≥ 1.4 (Docker only for Postgres) |

Both work on Linux, macOS and Windows 11. On Windows, run them from a
**WSL2** terminal (recommended) or **Git Bash** — not PowerShell or
`cmd.exe` — and clone the repo inside the WSL2 filesystem (`~/code/...`, not
`/mnt/c/...`) for fast builds.

## Run natively in one command (`dev:all`)

With Bun and a filled `backend/.env` (copy `backend/.env.example`):

```bash
bun run dev:all                       # API :4000, web :4001, Expo, desktop app
bun run dev:all --skip mobile,desktop # only API + web
bun run dev:all --host 192.168.0.10   # force the LAN IP handed to Expo
```

`scripts/dev.ts` starts the backend and the web dashboard, waits for the
API, opens the Electron desktop app once the dashboard answers, and runs
Expo with `EXPO_PUBLIC_API_URL=http://<this computer's LAN IP>:4000` so
Expo Go on a phone (same Wi-Fi) reaches the local API. Expo keeps the
terminal (QR code, `a` for the Android emulator); the other services print
with a `[name]` prefix; Ctrl+C stops everything. On Windows, allow Bun
through the firewall for private networks if the phone cannot connect.

## Run with Docker or PM2

```bash
git clone git@github.com:AlexGalhardo/galhardo-money-bot.git
cd galhardo-money-bot
./setups/setup-docker.sh            # or ./setups/setup-pm2.sh
```

Each script asks two questions (pass the database as an argument to skip
the first: `./setups/setup-docker.sh postgres`):

1. **Database** — SQLite (default, zero setup) or Postgres.
2. **PIX payments** — test mode (default: no keys, a button simulates the
   payment) or your own AbacatePay dev key (typed in, never stored in the
   repo).

What happens:

1. `backend/.env` and `bot/.env` are created from their `.env.example`
   files the first time, with fresh `BETTER_AUTH_SECRET` / `ENCRYPTION_KEY`.
   Existing files are kept; only the database settings are re-synced.
2. Docker: images are built and started with
   `docker compose -f infra/docker-compose[.sqlite].yml --project-directory . up --build`
   (the backend container applies migrations and generates the Prisma
   Client on start — `backend/docker-entrypoint.sh`). PM2: migrations and
   Prisma generate run on the host, then `pm2-runtime` starts the apps
   from `infra/ecosystem.local.config.js`.
3. The database is seeded with the demo account
   **`admin@gmail.com` / `adminBR@123`** (active plan, 500 deterministic
   demo transactions). Set `SEED_PERSONAL_EMAIL` / `SEED_PERSONAL_PASSWORD`
   in `backend/.env` to also create a personal account with no sample data.

Then open:

- API: <http://localhost:4000>
- Web: <http://localhost:4001> (the API reference lives at `/api`)

Logs stream in the terminal; **Ctrl+C** stops everything.

## Telegram bot (optional)

Fill `TELEGRAM_BOT_TOKEN` (from @BotFather) and `BOT_PASSWORD_HASH_BASE64`
(`cd bot && bun run hash-password "your-password"`) in `bot/.env`, then:

```bash
docker compose -f infra/docker-compose.sqlite.yml --project-directory . restart bot   # Docker + SQLite
docker compose -f infra/docker-compose.yml --project-directory . restart bot          # Docker + Postgres
./setups/setup-pm2.sh                                                                 # PM2: re-run, the bot starts once configured
```

The bot is multi-tenant: each chat links to its own account by logging in
from the chat (e-mail + password) or through the single-use browser link it
sends (Google or 2FA accounts). Use a separate test bot for local
development — only one process can long-poll a given token, so a local bot
with the production token kicks production off.

## Prisma Studio

```bash
cd backend && bun run db:studio      # PM2, or Docker + Postgres (port 5432 is exposed)
docker compose -f infra/docker-compose.sqlite.yml --project-directory . exec backend \
  bunx prisma studio --port 5555 --hostname 0.0.0.0    # Docker + SQLite (DB lives in a volume)
```

Both open <http://localhost:5555>.

## Useful commands

```bash
# Docker (swap the compose file for the Postgres variant)
docker compose -f infra/docker-compose.sqlite.yml --project-directory . logs -f backend
docker compose -f infra/docker-compose.sqlite.yml --project-directory . ps
docker compose -f infra/docker-compose.sqlite.yml --project-directory . down   # keeps the DB volume
bun run docker:sqlite:up | docker:sqlite:down | docker:postgres:up | docker:postgres:down

# PM2
pm2 status
pm2 logs elysia-backend
bun run pm2:start | pm2:start:bot | pm2:stop | pm2:restart | pm2:delete
```

## Troubleshooting

- **"Docker Desktop doesn't seem to be running"** — open it and wait for the
  whale icon to finish starting.
- **Slow builds / odd I/O errors on Windows** — the repo is under
  `/mnt/c/...`; clone it inside WSL2 instead.
- **`bad interpreter` / `\r` errors** — the file was checked out with CRLF;
  `.gitattributes` forces LF for `*.sh`, so re-clone or run
  `dos2unix setups/*.sh scripts/*.sh`.
- **`Permission denied` running a script** — `chmod +x setups/*.sh` (they
  are tracked as executable since 2026-09-27).
- **PM2 not found after install (WSL2)** — make sure `which bun` / `which pm2`
  point inside the distro (`/home/<you>/.bun/...`), not to a Windows install.
- **Port already in use** — both scripts free ports 4000/4001 (and 5432 for
  Postgres) before starting, stopping old PM2 processes and containers.

## Importing a Nubank statement

The dashboard's **Importar** button (and the mobile app's Import tab)
accepts the Nubank statement `.csv` (`Data,Valor,Identificador,Descrição`).
Negative values become expenses, positive ones income. Categories are
suggested from keywords (e.g. "RDB" → Investments, "SEGURADORA" →
Insurance, "Pix" → Transfers); unmatched rows are flagged for review before
confirming. Re-importing the same file doesn't duplicate rows (same
description, amount and day). Never commit these files — `*.csv` is
gitignored and blocked by the pre-commit hook.
