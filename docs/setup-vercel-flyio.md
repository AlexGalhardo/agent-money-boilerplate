# Deploy em Vercel (frontend) + Fly.io (API)

Alternativa a VPS: frontend na Vercel (TanStack Start tem suporte nativo) e
API no Fly.io (roda o `backend/Dockerfile` direto, sem servidor próprio para
gerenciar).

## Frontend na Vercel

```bash
cd frontend
bunx vercel link
bunx vercel env add VITE_API_URL production   # https://SEU_APP.fly.dev
bunx vercel --prod
```

A Vercel detecta o TanStack Start automaticamente (builder `@vercel/vite`).
Não é necessário configurar nada além da variável `VITE_API_URL`.

## API no Fly.io

```bash
curl -L https://fly.io/install.sh | sh
cd backend
fly launch --no-deploy --dockerfile Dockerfile
```

No `fly.toml` gerado, ajuste a porta interna para `4000` e adicione as
variáveis de ambiente (ou use `fly secrets set`):

```bash
fly secrets set \
  BETTER_AUTH_SECRET=$(openssl rand -hex 32) \
  ENCRYPTION_KEY=$(openssl rand -hex 32) \
  APP_URL=https://SEU_APP.fly.dev \
  FRONTEND_URL=https://SEU_FRONTEND.vercel.app \
  DATABASE_PROVIDER=postgresql \
  DATABASE_URL=postgresql://...
```

Banco gerenciado pelo Fly (`fly postgres create`) ou qualquer Postgres externo
(Neon, Supabase, etc.) — basta apontar `DATABASE_URL`.

```bash
fly deploy --dockerfile Dockerfile
```

O build a partir da raiz do monorepo é necessário porque o `Dockerfile` da
API referencia `package.json`/`bun.lock` do workspace; rode `fly deploy` a
partir da **raiz** do repositório, não de `backend/`:

```bash
cd ..
fly deploy --config backend/fly.toml --dockerfile backend/Dockerfile
```

## Cronjob de verificação de plano expirado

Duas opções, dependendo de onde a API está:

- **API na própria Vercel** (alternativa ao Fly.io): use `backend/vercel.json`
  (já configurado) — a Vercel chama `GET /cron/check-expired-plans`
  automaticamente todo dia às 3h, autenticando com
  `Authorization: Bearer $CRON_SECRET` (defina `CRON_SECRET` nas env vars do
  projeto Vercel).
- **API no Fly.io**: crie uma [Fly Machine agendada](https://fly.io/docs/machines/flyctl/fly-machine-run/)
  ou um cronjob externo (ex.: [cron-job.org](https://cron-job.org),
  GitHub Actions com `schedule`) chamando:

  ```bash
  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://SEU_APP.fly.dev/cron/check-expired-plans
  ```

## Migrations em produção

Rode uma vez após cada deploy que altere o schema:

```bash
fly ssh console -C "bun run db:deploy:postgres"
```
