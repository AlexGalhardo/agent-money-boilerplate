---
name: respondeae-local-verification
description: >
  Como validar uma mudança no RespondeAê localmente do mesmo jeito que o CI valida (lint, tipos, unit, integração,
  build, smoke, e2e em dev e em modo produção). Use antes de dar qualquer tarefa como pronta, quando um teste passa
  local e falha no CI, ou quando build/e2e falham por banco, captcha, Bun vs Node ou Prisma.
---

# Validar como o CI valida

## Banco descartável

Nunca rode integração/smoke/e2e contra o banco do `.env` (é o banco de dev, com dados). Suba um Postgres descartável e
exporte a URL só para o comando:

```bash
docker run -d --name respondeae-ci-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=perguntae_db -p 55432:5432 postgres:17-alpine
export DATABASE_URL="postgresql://postgres:postgres@localhost:55432/perguntae_db"
bunx prisma migrate deploy
```

O `next build` faz queries (páginas estáticas como `/top-curtidas`), então também precisa desse `DATABASE_URL`.

## Sequência (mesma ordem do CI)

```bash
bun run lint:ci            # falha também com warning
bunx tsc --noEmit
bun run test               # unit
bun run test:integration
bun run build && bun run test:smoke
bunx playwright test       # e2e contra next dev
```

## E2E em modo produção (o que o CI roda)

O CI roda o e2e contra `next start`, onde o captcha é obrigatório. Use as chaves de teste da Cloudflare, que sempre
passam, **no build** (`NEXT_PUBLIC_*` é embutido em build time):

```bash
export NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
export CLOUDFLARE_TURNSTILE_SECRET=1x0000000000000000000000000000000AA
bun run build && CI=true bunx playwright test --retries=0
```

## Armadilhas já encontradas

- **Rode o Next com Node, não Bun**: sob o runtime do Bun, `@prisma/client` e `pg` externalizados pelo Turbopack não
  resolvem (`ResolveMessage: Cannot find module '@prisma/client-<hash>'`). Playwright e smoke já usam `node`.
- **Prisma 7 não regenera o client no `migrate dev`**: rode `bun run prisma:generate` depois de mudar o schema, e
  replique a mudança em `prisma/schema.sqlite.prisma`.
- **Gerar o client com `DATABASE_URL=file:...`** troca o client para SQLite; regenere com a URL Postgres depois.
- **Rate limit nos e2e**: cadastro é limitado por IP. Testes que cadastram chamam `useUniqueClientIp(page)`
  (`tests/e2e/helpers.ts`) e esperam o captcha com `waitForCaptcha(page)`.
- **Primeira execução do `next dev` é lenta** (compila rota por rota); um timeout isolado de `waitForURL` na primeira
  rodada não é bug, rode de novo antes de investigar.
- **`NEXTAUTH_URL` na porta do teste**: o Playwright sobe o Next na 3200. Com o `NEXTAUTH_URL` do `.env` em outra porta, todo `signOut` (troca de senha, excluir conta) redireciona para um servidor que não existe (`ERR_CONNECTION_REFUSED`). Rode com `NEXTAUTH_URL=http://localhost:3200`.
- **Hook `pre-push`** roda unit + build: exporte o `DATABASE_URL` descartável ao dar push.
