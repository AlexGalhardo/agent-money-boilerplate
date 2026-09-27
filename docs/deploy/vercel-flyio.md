# Deploy on Vercel (web) + Fly.io (API)

An alternative to a VPS: the web app on Vercel (TanStack Start is supported
natively) and the API on Fly.io from `backend/Dockerfile`.

> Not exercised end to end in this repository — production runs on
> Railway ([`railway.md`](./railway.md)). Treat this as a starting point.

## Web on Vercel

```bash
cd frontend
bunx vercel link
bunx vercel env add VITE_API_URL production   # https://YOUR_APP.fly.dev
bunx vercel --prod
```

`VITE_API_URL` is read at build time. The web app proxies the API paths
listed in `frontend/proxy-paths.ts` through its own origin (required for
the session cookie) — on Vercel that proxy must be recreated with rewrites,
since `frontend/server.ts` (the production wrapper that does it elsewhere)
doesn't run there.

## API on Fly.io

Run everything from the **repository root** — the Dockerfile needs the
workspace `package.json`, `bun.lock` and `patches/`:

```bash
curl -L https://fly.io/install.sh | sh
fly launch --no-deploy --dockerfile backend/Dockerfile --config backend/fly.toml
```

Set the internal port to `4000` in `backend/fly.toml`, then the secrets:

```bash
fly secrets set --config backend/fly.toml \
  NODE_ENV=production \
  BETTER_AUTH_SECRET=$(openssl rand -hex 32) \
  ENCRYPTION_KEY=$(openssl rand -hex 32) \
  CRON_SECRET=$(openssl rand -hex 32) \
  APP_URL=https://YOUR_APP.fly.dev \
  FRONTEND_URL=https://YOUR_FRONTEND.vercel.app \
  DATABASE_PROVIDER=postgresql \
  DATABASE_URL=postgresql://...

fly deploy --config backend/fly.toml --dockerfile backend/Dockerfile
```

Any Postgres works (`fly postgres create`, Neon, Supabase…). Migrations run
on container start (`backend/docker-entrypoint.sh`).

## Cron jobs

- API on Vercel instead: `backend/vercel.json` already schedules
  `GET /cron/check-expired-plans` daily at 03:00 with `CRON_SECRET`.
- API on Fly.io: a scheduled Fly Machine, GitHub Actions `schedule`, or an
  external pinger calling both routes with
  `Authorization: Bearer $CRON_SECRET` (see [`vps.md`](./vps.md#cron-jobs-both-variants)).
