# Deploy on Railway (production)

Production runs on Railway: three services — `backend`, `frontend`, `bot` —
built from **one image** (`infra/Dockerfile`), plus a managed Postgres.
Each service has its own logs, restarts, scaling and variables.

## Why one image for three services

Railway always builds the whole Dockerfile — it can't pick a multi-stage
`--target` per service ([confirmed by Railway staff](https://station.railway.com/questions/use-dockerfile-targets-564aea7a)).
So `infra/Dockerfile` has a single final stage with all three apps, and
each service picks what to run **at runtime** through
`RAILWAY_SERVICE_TARGET` (`backend` | `frontend` | `bot`), read by
`setups/railway-entrypoint.sh`. The image is built once per service (three
builds), same as separate Dockerfiles would.

## 1. Project and database

1. **New Project → Empty Project**.
2. **Create → Database → Add PostgreSQL** — exposes
   `${{Postgres.DATABASE_URL}}` to the other services.

Postgres, not SQLite: services run on separate filesystems, and `backend`
and `bot` must share the database.

## 2. Three services from the same repo

Three times: **Create → GitHub Repo →** this repository, then rename them
`backend`, `frontend` and `bot` (variables below reference those names).

In each service: **Settings → Build → Dockerfile Path → `infra/Dockerfile`**
(leave Root Directory empty). Without it Railway falls back to Railpack,
which knows nothing about `RAILWAY_SERVICE_TARGET`.

## 3. Variables

Generate fresh secrets — never reuse `.env.example` values:

```bash
openssl rand -hex 32   # BETTER_AUTH_SECRET, ENCRYPTION_KEY (64 hex chars), CRON_SECRET
```

### `backend`

```bash
RAILWAY_SERVICE_TARGET=backend
NODE_ENV=production
DATABASE_PROVIDER=postgresql
DATABASE_URL=${{Postgres.DATABASE_URL}}
BETTER_AUTH_SECRET=<generated>
ENCRYPTION_KEY=<generated>
CRON_SECRET=<generated>
APP_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
FRONTEND_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
ENABLE_CONFIRM_EMAIL=false
ENABLE_2FA=false
ENABLE_ABACATEPAY=false
ABACATEPAY_PIX_TEST_MODE=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
ABACATEPAY_API_KEY=
ABACATEPAY_WEBHOOK_SECRET=
```

Don't set `PORT` — Railway injects it.

### `frontend`

```bash
RAILWAY_SERVICE_TARGET=frontend
VITE_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
```

`VITE_API_URL` is baked in at **build time** (the Dockerfile declares
`ARG VITE_API_URL`, which Railway fills from the variable). Changing the
backend domain later requires **redeploying the frontend**.

### `bot`

```bash
RAILWAY_SERVICE_TARGET=bot
NODE_ENV=production
DATABASE_PROVIDER=postgresql
DATABASE_URL=${{Postgres.DATABASE_URL}}
BETTER_AUTH_SECRET=<same as backend>
ENCRYPTION_KEY=<same as backend>
FRONTEND_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
TELEGRAM_BOT_TOKEN=<from @BotFather>
BOT_PASSWORD_HASH_BASE64=<cd bot && bun run hash-password "...">
TELEGRAM_BOT_USE_PASSWORD_TO_CONFIRM_ACTIONS=false
ENABLE_ABACATEPAY=false
ABACATEPAY_API_KEY=
ABACATEPAY_PIX_TEST_MODE=false
```

The bot is a long-polling worker: no port, no public domain.

## 4. Public domains

In `backend` and `frontend` (not `bot`): **Settings → Networking →
Generate Domain**, then **Redeploy** both so `${{...}}` references resolve.

## 5. Deploy

Every push to the connected branch deploys the three services — **after**
GitHub Actions passes: "Wait for CI" (`source.checkSuites=true`) is enabled
on the production services, so a red `ci.yml` blocks the deploy. The
backend runs `prisma migrate deploy` on every start.

Check:

```bash
curl https://YOUR-BACKEND.up.railway.app/          # {"success":true,...}
curl https://YOUR-BACKEND.up.railway.app/openapi/json | head -c 200
curl -I https://YOUR-FRONTEND.up.railway.app/      # HTTP/2 200 + security headers
```

Don't seed production — the seed refuses `NODE_ENV=production`.

## Environments

| Environment  | Branch | Notes                                                                                                                                    |
| ------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `production` | `main` | Gated by CI                                                                                                                              |
| `sandbox`    | `dev`  | Duplicated from production — it inherited real Resend/Google keys; replace them with test keys (open item, see [`ci-cd.md`](./ci-cd.md)) |

## Cron

Railway has no HTTP cron. Use cron-job.org or a GitHub Actions `schedule`
calling `/cron/check-expired-plans` and `/cron/delete-pending-accounts` with
`Authorization: Bearer $CRON_SECRET` (see [`vps.md`](./vps.md#cron-jobs-both-variants)).

## Troubleshooting

- **Frontend loads but API calls fail / SSR "Unable to connect"** —
  `VITE_API_URL` was wrong at build time; fix it and redeploy the frontend.
- **Backend restart loop** — check `RAILWAY_SERVICE_TARGET` (case-sensitive)
  and `DATABASE_URL`.
- **Bot crashes with 401** — `TELEGRAM_BOT_TOKEN` invalid.
- **Bot crashes with 409** — another process (e.g. a local bot) is polling
  the same token.
- **Deploy "SKIPPED"** — CI is red for that commit; fix CI first.

## Testing the image locally

```bash
docker build -f infra/Dockerfile -t agent-money .
docker run -p 4000:4000 --env-file backend/.env -e RAILWAY_SERVICE_TARGET=backend -e PORT=4000 agent-money
```

For day-to-day local work use [`local-setup.md`](./local-setup.md) instead.
