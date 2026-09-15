# AGENTS.md

Instruções para agentes de codificação (Claude Code, Codex, Cursor, etc.) neste
repositório. Se a ferramenta que você está usando também lê `CLAUDE.md`, os dois
arquivos são consistentes entre si; este aqui é a versão agnóstica de ferramenta.

## Setup

```bash
bun install
cp api/.env.example api/.env
# preencher BETTER_AUTH_SECRET e ENCRYPTION_KEY com `openssl rand -hex 32` cada
cd api && bun run db:deploy && bun run db:generate && bun run db:seed && cd ..
```

Ou, tudo de uma vez, com um dos 4 scripts na raiz (todos perguntam SQLite ou
Postgres, ou aceitam o banco como argumento: `./setup-unix-using-docker.sh postgres`):
`setup-unix-using-docker.sh`, `setup-unix-using-pm2.sh`,
`setup-windows-using-docker.sh`, `setup-windows-using-pm2.sh` — detalhes em
`docs/setup-unix-using-docker.md` e demais `docs/setup-*.md`.

Rodar localmente (dois processos):

```bash
bun run api:dev        # http://localhost:4000
bun run frontend:dev   # http://localhost:4001
```

## Estrutura

Monorepo com três workspaces Bun:

- `api/` — ElysiaJS + Prisma + better-auth + Zod. Módulos por domínio em
  `api/src/modules/<dominio>/`, cada um com `*.routes.ts` → `*.service.ts` →
  `*.repository.ts`. Só o `*.repository.ts` importa o cliente Prisma.
- `frontend/` — TanStack Start + Tailwind v4. Rotas em
  `frontend/src/routes/`, componentes reutilizáveis em `frontend/src/components/`.
  Cliente HTTP tipado via Eden em `frontend/src/lib/api.ts` (importa o tipo
  `App` da API diretamente — não existe geração de client separada).
- `bot/` — bot do Telegram (grammY + `@grammyjs/conversations`), multi-tenant
  (cada chat se vincula à própria conta, exige plano ativo). Importa
  Prisma/criptografia/regras de negócio (inclusive `paymentService`)
  diretamente de `@elysia-galhardo-finances/api` (mesmo banco, sem HTTP entre
  os dois) — ver `docs/telegram-bot.md`.

## Testes

```bash
cd api
bun run test:unit          # rápido, sem banco
bun run test               # unit + integration (sobe banco sqlite de teste)

cd ../frontend
bunx playwright test       # E2E, sobe API + frontend em portas dedicadas
```

Todo teste unitário fica ao lado do arquivo testado (`foo.service.ts` +
`foo.service.unit.test.ts`), mockando a camada de repositório com
`mock.module` do `bun:test` — nunca bata num banco real em teste unitário.

## Estilo de código

- Formatação e lint via Biome (`bun run lint`, `bun run lint:fix`,
  `bun run format`) — tabs, largura de linha 120. Não formate manualmente.
- Sem comentários que descrevem o óbvio. Comente só quando o *porquê* não é
  óbvio pelo código (restrição escondida, workaround de bug específico,
  invariante não trivial).
- Não introduza abstrações, flags de feature ou tratamento de erro para
  cenários que não podem acontecer. Siga o padrão já estabelecido no módulo
  mais próximo antes de inventar um novo.
- Categorias de transação são um enum fixo definido em
  `api/src/modules/transactions/transaction.schema.ts`
  (`transactionCategories`), com rótulos duplicados de propósito em
  `frontend/src/lib/categories.ts` e `bot/src/formatting/format.ts`
  (`categoryLabels`) — os três precisam ser editados juntos, não há tabela de
  categorias no banco.
- Existem **dois schemas Prisma** (`schema.sqlite.prisma` e
  `schema.postgresql.prisma`) que devem ter modelos idênticos sempre — qualquer
  mudança de `model` precisa ser replicada nos dois arquivos manualmente.

## Antes de considerar uma tarefa pronta

```bash
(cd api && bunx --bun tsc --noEmit && bun run test:setup && bun run test && bun run build)
(cd frontend && bunx --bun tsc --noEmit && bun run build)
```

Isso é exatamente o que o hook `pre-push` do Husky roda — se falhar aqui, vai
falhar no push. Não pule hooks (`--no-verify`) para contornar uma falha real.

## Instruções de PR

- Mensagens de commit e descrições de PR em português, no mesmo tom objetivo
  do `CHANGELOG.md` existente (o quê + por quê, sem enrolação).
- Nunca commite `.env`, chaves ou segredos — `.gitignore` já cobre `api/.env`,
  mas confira antes de um `git add` amplo.
- Rode lint + typecheck + testes localmente antes de abrir o PR; CI
  (`.github/workflows/ci.yml`) roda os mesmos passos e bloqueia merge se falhar.
