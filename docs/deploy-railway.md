# Deploy no Railway (api + frontend + bot)

Um único `infra/Dockerfile` como fonte da verdade, com os 3
serviços — `api`, `frontend` e `bot` — deployados como **3 Railway services
separados** dentro do mesmo projeto, cada um com seus próprios logs,
restarts, scaling e variáveis de ambiente.

## Por que não é `docker build --target` por serviço

O desenho original (um Dockerfile com `FROM base AS backend` / `AS frontend`
/ `AS bot`, cada Railway service buildando com `--target` diferente) **não
funciona no Railway**: a plataforma não suporta escolher um build target de
Dockerfile por serviço, ela sempre builda o `Dockerfile` inteiro. Confirmado
por um funcionário da Railway
([station.railway.com/questions/use-dockerfile-targets-564aea7a](https://station.railway.com/questions/use-dockerfile-targets-564aea7a)):

> unfortunately railway does not support specfying a target, you would need
> to break the dockerfile up into separate dockerfiles

O `Dockerfile` deste repo usa o workaround recomendado pela própria
comunidade da Railway: um único estágio final (`runtime`) com os 3 serviços
dentro da mesma imagem. Cada Railway service aponta para esse mesmo
`Dockerfile`/repo e escolhe, em **runtime** (não em build time), qual
processo esse container roda — através da variável de ambiente
`RAILWAY_SERVICE_TARGET` (`backend` | `frontend` | `bot`), lida por
`setups/railway-entrypoint.sh`. Isso ainda entrega tudo que a ideia original
buscava: um Dockerfile só, e três serviços com deploy/logs/restart/scaling/env
vars independentes — só que a escolha de "qual serviço é esse container"
acontece na hora de rodar, não na hora de buildar.

Isso significa que a mesma imagem é buildada (build completo, sem cache
compartilhado entre eles) uma vez por serviço no Railway — 3 builds, como já
seria o caso com Dockerfiles separados.

## Pré-requisitos

- Conta no [Railway](https://railway.com/)
- Repositório no GitHub com este projeto (Railway builda a partir do GitHub,
  não faz upload direto de Dockerfile)
- `openssl` (ou qualquer gerador de hex) para gerar segredos

## Passo 1 — Criar o projeto e o Postgres

1. **New Project** → **Empty Project**.
2. Dentro do projeto, **Create** → **Database** → **Add PostgreSQL**. Isso
   cria um serviço chamado `Postgres` com uma variável `DATABASE_URL` pronta
   para referenciar dos outros serviços (`${{Postgres.DATABASE_URL}}`).

> Por que Postgres e não SQLite aqui: os 3 serviços do Railway rodam em
> containers/filesystems separados — um arquivo SQLite não pode ser
> compartilhado entre `api` e `bot` (que precisam do mesmo banco) sem um
> volume compartilhável entre serviços, que o Railway não oferece. Postgres
> gerenciado resolve isso de graça.

## Passo 2 — Criar os 3 serviços a partir do mesmo repo

Repita 3 vezes: **Create** → **GitHub Repo** → selecione este repositório.
Renomeie cada serviço (⋮ → **Rename**) para `backend`, `frontend` e `bot`
respectivamente — os nomes importam, porque as variáveis de ambiente do
Passo 3 referenciam esses nomes (`${{backend.RAILWAY_PUBLIC_DOMAIN}}` etc.).

Railway só builda com Dockerfile automaticamente quando ele está na raiz do
repo — como o nosso vive em `infra/Dockerfile`, configure explicitamente em
cada um dos 3 serviços: aba **Settings** → **Build** → **Dockerfile Path** →
`infra/Dockerfile` (deixe **Root Directory** vazio/raiz; o `context: ..` dos
`docker-compose*.yml` não se aplica aqui, é só o Dockerfile que muda de
lugar). Sem isso, o Railway cai de volta pro builder Railpack automático, que
não sabe nada sobre `RAILWAY_SERVICE_TARGET`.

## Passo 3 — Variáveis de ambiente por serviço

Em cada serviço: aba **Variables** → **Raw Editor** (cola tudo de uma vez) ou
adicione uma por uma. Gere segredos novos, não reuse os do `.env.example`:

```bash
openssl rand -hex 32   # BETTER_AUTH_SECRET
openssl rand -hex 32   # ENCRYPTION_KEY (precisa ser 64 hex chars / 32 bytes)
```

### `backend`

```bash
RAILWAY_SERVICE_TARGET=backend
NODE_ENV=production
DATABASE_PROVIDER=postgresql
DATABASE_URL=${{Postgres.DATABASE_URL}}
BETTER_AUTH_SECRET=<gere-com-openssl-rand-hex-32>
ENCRYPTION_KEY=<gere-com-openssl-rand-hex-32>
APP_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
FRONTEND_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
ENABLE_CONFIRM_EMAIL=false
ENABLE_2FA=false
ENABLE_ABACATEPAY=false
GOOGLE_CLIENT_ID=<seu-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<seu-google-client-secret>
RESEND_API_KEY=<sua-resend-api-key>
RESEND_FROM_EMAIL=onboarding@resend.com
ABACATEPAY_API_KEY=<sua-abacatepay-api-key>
ABACATEPAY_WEBHOOK_SECRET=<seu-abacatepay-webhook-secret>
ABACATEPAY_PIX_TEST_MODE=false
CRON_SECRET=<gere-com-openssl-rand-hex-32>
```

Não defina `PORT` — o Railway injeta essa variável automaticamente e
`backend/src/server.ts` já escuta em `process.env.PORT`.

### `frontend`

```bash
RAILWAY_SERVICE_TARGET=frontend
VITE_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
```

`VITE_API_URL` é lido em **build time** (fica embutido no bundle do cliente
e do SSR — ver `frontend/src/lib/api.ts`), não em runtime. O `Dockerfile`
declara `ARG VITE_API_URL` no estágio `frontend-build`; o Railway injeta
automaticamente o valor da variável de mesmo nome do serviço como build arg
— só funciona porque o `ARG` existe no Dockerfile. **Se você mudar o domínio
do backend depois, precisa redeployar o `frontend`** (Deployments → ⋮ →
Redeploy) para o novo valor ser rebuildado no bundle — só trocar a variável
não é suficiente, já que ela só é lida durante o build.

Também não defina `PORT` aqui — mesmo motivo do backend
(`frontend/server.ts` já lê `process.env.PORT`).

### `bot`

```bash
RAILWAY_SERVICE_TARGET=bot
NODE_ENV=production
DATABASE_PROVIDER=postgresql
DATABASE_URL=${{Postgres.DATABASE_URL}}
BETTER_AUTH_SECRET=<gere-com-openssl-rand-hex-32>
ENCRYPTION_KEY=<gere-com-openssl-rand-hex-32>
TELEGRAM_BOT_TOKEN=<token-do-botfather>
BOT_PASSWORD_HASH_BASE64=<hash-bcrypt-em-base64>
FRONTEND_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
BOT_MAX_ATTEMPTS=5
BOT_LOCKOUT_MINUTES=15
ENABLE_ABACATEPAY=false
ABACATEPAY_API_KEY=<sua-abacatepay-api-key>
ABACATEPAY_PIX_TEST_MODE=false
```

Gere `BOT_PASSWORD_HASH_BASE64` localmente (nunca comite a senha em texto
puro):

```bash
cd bot && bun run hash-password "sua-senha"
```

O serviço `bot` não escuta porta nenhuma (é um worker de long-polling do
Telegram) — não gere domínio público pra ele no Passo 4.

## Passo 4 — Domínios públicos

Em **`backend`** e **`frontend`** (não no `bot`): aba **Settings** →
**Networking** → **Generate Domain**. Isso preenche
`RAILWAY_PUBLIC_DOMAIN` para esse serviço, que é o que as variáveis
`APP_URL`/`FRONTEND_URL`/`VITE_API_URL` do Passo 3 referenciam — gere os dois
domínios **antes** do primeiro deploy terminar de configurar essas
variáveis, senão elas resolvem vazias.

Depois de gerar os domínios, dê **Redeploy** em `backend` e `frontend` para
que as variáveis com `${{...}}` sejam reavaliadas com o domínio já existente.

## Passo 5 — Deploy

Cada `git push` na branch conectada dispara os 3 deploys automaticamente
(um build por serviço, já que não há como compartilhar target). Para o
primeiro deploy manual, use **Deploy** no topo de cada serviço.

O `backend` roda `prisma migrate deploy` sozinho a cada start (ver
`setups/railway-entrypoint.sh`) — não precisa rodar migrations manualmente depois
do deploy, nem para o primeiro (que cria as tabelas do zero a partir de
`backend/prisma/migrations-postgresql/`).

Verifique:

```bash
curl https://SEU-BACKEND.up.railway.app/
# {"success":true,"message":"Agent Money Boilerplate API"}

curl -I https://SEU-FRONTEND.up.railway.app/
# HTTP/2 200
```

Populando o banco com dados de exemplo (opcional, roda uma vez): aba
**Backend** → menu ⋮ do deployment ativo → **Shell**, e dentro dela:

```bash
cd backend && bun run db:seed
```

## Cron: verificação de plano expirado e limpeza de contas pendentes

O `backend` expõe `GET /cron/check-expired-plans` e
`GET /cron/delete-pending-accounts`, autenticados com
`Authorization: Bearer $CRON_SECRET` (mesmo mecanismo usado hoje pelo Vercel
Cron, ver `backend/vercel.json` e `backend/src/modules/payments/payment.routes.ts`).
O Railway não tem um "cron de HTTP" nativo equivalente — use um serviço
externo gratuito como [cron-job.org](https://cron-job.org) ou um workflow do
GitHub Actions com `schedule`, chamando:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://SEU-BACKEND.up.railway.app/cron/check-expired-plans
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://SEU-BACKEND.up.railway.app/cron/delete-pending-accounts
```

## Troubleshooting

- **Frontend carrega mas as chamadas à API falham / SSR quebra com "Unable
  to connect"** — `VITE_API_URL` estava errado (ou vazio) no momento do
  build do `frontend`. Confira a variável, redeploy o `frontend` (build
  time, não runtime — ver Passo 3).
- **Backend reinicia em loop logo após subir** — confira
  `RAILWAY_SERVICE_TARGET` (typo comum: `backend` vs `Backend`, o `case` do
  `setups/railway-entrypoint.sh` é sensível a maiúsculas) e se `DATABASE_URL`
  aponta pro serviço `Postgres` certo (`${{Postgres.DATABASE_URL}}`).
- **Bot reinicia com erro 401/Unauthorized do Telegram** —
  `TELEGRAM_BOT_TOKEN` inválido ou não definido.
- **Erro de senha ao logar no bot** — `BOT_PASSWORD_HASH_BASE64` precisa ser
  o hash em base64 (não a senha em texto puro, nem o hash bcrypt cru — ver
  Passo 3).

## Testando localmente antes de subir

```bash
docker build -t elysia-finances .

docker run -p 4000:4000 --env-file backend/.env \
  -e RAILWAY_SERVICE_TARGET=backend -e PORT=4000 \
  elysia-finances

docker build --build-arg VITE_API_URL=http://localhost:4000 -t elysia-finances-fe .
docker run -p 4001:4001 -e RAILWAY_SERVICE_TARGET=frontend -e PORT=4001 elysia-finances-fe
```

Para desenvolvimento local do dia a dia, prefira
[`setup-unix-using-docker.md`](./setup-unix-using-docker.md) /
[`setup-windows-using-docker.md`](./setup-windows-using-docker.md) — usam
`infra/docker-compose.yml`/`infra/docker-compose.sqlite.yml`, que buildam
cada serviço a partir do seu próprio `Dockerfile` (`backend/`, `frontend/`,
`bot/`) e já sobem um banco junto. `infra/Dockerfile` e
`setups/railway-entrypoint.sh` existem especificamente para o desenho de
deploy do Railway descrito aqui.
