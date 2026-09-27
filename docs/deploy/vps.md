# Deploy on an Ubuntu VPS

Two ways to run production on your own Ubuntu 26.04 LTS server, both behind
Caddy (automatic TLS):

| Variant                                        | Runs                                          | Choose it when                        |
| ---------------------------------------------- | --------------------------------------------- | ------------------------------------- |
| [A — Docker Compose](#a--docker-compose)       | Postgres + API + web + Caddy as containers    | You're fine with Docker on the server |
| [B — from scratch](#b--from-scratch-no-docker) | Postgres, Caddy and PM2 installed on the host | You want no Docker at all             |

Both need DNS **A records** for `YOUR_DOMAIN` and `api.YOUR_DOMAIN` pointing
at the server — Caddy issues the certificates on the first request.

The Telegram bot isn't part of these stacks; run it on the same server with
PM2 (`pm2 start infra/ecosystem.config.js --only elysia-bot` after filling
`bot/.env`) or deploy it separately.

## A — Docker Compose

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER      # log out and back in for the group to apply

git clone git@github.com:AlexGalhardo/galhardo-money-bot.git
cd galhardo-money-bot
cp .env.example .env               # compose variables
cp backend/.env.example backend/.env
```

`.env` (root):

```env
DOMAIN=YOUR_DOMAIN
POSTGRES_PASSWORD=<openssl rand -hex 24>
```

`backend/.env` — `DATABASE_*` are overridden by `infra/docker-compose.prod.yml`:

```env
NODE_ENV=production
APP_URL=https://api.YOUR_DOMAIN
FRONTEND_URL=https://YOUR_DOMAIN
BETTER_AUTH_SECRET=<openssl rand -hex 32>
ENCRYPTION_KEY=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 32>
```

Add Google / Resend / AbacatePay credentials for the feature flags you turn
on. Then:

```bash
docker compose -f infra/docker-compose.prod.yml --project-directory . up -d --build
```

Migrations run automatically on container start. **Don't run `db:seed` in
production** — it refuses to (`NODE_ENV=production`) because the demo
admin's password is public.

Updates:

```bash
git pull && docker compose -f infra/docker-compose.prod.yml --project-directory . up -d --build
```

## B — From scratch (no Docker)

```bash
# system + deploy user
ssh root@YOUR_IP
apt update && apt upgrade -y
adduser deploy && usermod -aG sudo deploy && su - deploy

# Bun + PM2
curl -fsSL https://bun.sh/install | bash && source ~/.bashrc
bun install -g pm2

# Postgres
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE USER elysia WITH PASSWORD '<strong-password>';"
sudo -u postgres psql -c "CREATE DATABASE elysia_financas OWNER elysia;"

# Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

App:

```bash
git clone git@github.com:AlexGalhardo/galhardo-money-bot.git
cd galhardo-money-bot && bun install
cp backend/.env.example backend/.env
```

`backend/.env`:

```env
NODE_ENV=production
APP_URL=https://api.YOUR_DOMAIN
FRONTEND_URL=https://YOUR_DOMAIN
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://elysia:<strong-password>@localhost:5432/elysia_financas
BETTER_AUTH_SECRET=<openssl rand -hex 32>
ENCRYPTION_KEY=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 32>
```

Build and start:

```bash
(cd backend && bun run db:deploy:postgres && bun run build)            # compiled binary: backend/server
(cd frontend && VITE_API_URL=https://api.YOUR_DOMAIN bun run build)    # frontend/dist, served by frontend/server.ts
pm2 start infra/ecosystem.config.js
pm2 save && pm2 startup            # follow the printed instruction to start on boot

sudo cp infra/Caddyfile.vps /etc/caddy/Caddyfile
sudo sed -i "s/{\$DOMAIN}/YOUR_DOMAIN/" /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Updates:

```bash
git pull && bun install
(cd backend && bun run db:deploy:postgres && bun run build)
(cd frontend && VITE_API_URL=https://api.YOUR_DOMAIN bun run build)
pm2 restart infra/ecosystem.config.js
```

`VITE_API_URL` is baked in at **build time** — rebuild the frontend when the
API domain changes.

## Cron jobs (both variants)

The API exposes two routes authenticated with `Authorization: Bearer $CRON_SECRET`:

```cron
0 3 * * * curl -fsS -H "Authorization: Bearer <CRON_SECRET>" https://api.YOUR_DOMAIN/cron/check-expired-plans
30 3 * * * curl -fsS -H "Authorization: Bearer <CRON_SECRET>" https://api.YOUR_DOMAIN/cron/delete-pending-accounts
```

(Variant B can also run `cd backend && bun run cron:check-expired-plans`.)

## Useful commands

```bash
docker compose -f infra/docker-compose.prod.yml --project-directory . logs -f backend   # A
pm2 status && pm2 logs elysia-backend                                                   # B
```
