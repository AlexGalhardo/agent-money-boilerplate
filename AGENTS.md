# CLAUDE.md

Guia para o Claude Code (e outros agentes de IA) trabalhando neste repositório.

## IMPORTANTE

- Não crie nem edite nenhum arquivo changelod.md

## O que é este projeto

**Elysia Finanças** — controle de finanças pessoais (transações, categorias,
relatórios visuais). Monorepo Bun com dois workspaces:

```
/api/           → ElysiaJS (REST API, auth, pagamentos, cron)
/frontend/      → TanStack Start (SSR)
/bot/           → bot do Telegram (reusa Prisma/criptografia/regras da API)
/http-client/   → chamadas HTTP de referência (api.http)
/docs/          → guias de setup e deploy
```

Tipagem ponta-a-ponta entre API e frontend via [Eden](https://elysiajs.com/eden/overview.html)
(`frontend/src/lib/api.ts` importa o tipo `App` exportado por `api/src/server.ts`) —
qualquer rota nova na API já fica tipada no frontend sem gerar nada.

## Stack

| Camada        | Tecnologia                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Runtime / API | Bun + ElysiaJS                                                                                   |
| ORM           | Prisma (schema duplicado: `schema.sqlite.prisma` e `schema.postgresql.prisma` — ver nota abaixo) |
| Validação     | Zod                                                                                              |
| Autenticação  | better-auth (sessão via cookie, plugin de 2FA opcional)                                          |
| Frontend      | TanStack Start + Tailwind CSS v4                                                                 |
| Testes        | `bun:test` (unit/integration/smoke) + Playwright (E2E)                                           |
| Lint/format   | Biome (tabs, largura de linha 120)                                                               |

## Comandos essenciais

Rodar a partir da raiz do monorepo:

```bash
bun install                 # instala tudo (workspaces)
bun run api:dev             # API em http://localhost:4000
bun run frontend:dev        # frontend em http://localhost:4001
bun run lint                # biome check
bun run typecheck:api       # tsc --noEmit da API
bun run typecheck:frontend  # tsc --noEmit do frontend
```

Dentro de `api/`:

```bash
bun run test:unit           # só *.unit.test.ts, sem precisar de banco
bun run test                # unit + integration (sobe um banco sqlite de teste primeiro)
bun run db:seed             # popula o banco (ver "Usuários de seed" abaixo)
bun run db:deploy && bun run db:generate   # aplica migrations + gera o Prisma Client
```

Setup completo do zero, 4 variantes conforme SO e uso ou não de Docker (todas
perguntam interativamente SQLite ou Postgres, ou aceitam o banco como
argumento para pular a pergunta — ex: `./setup-unix-using-docker.sh postgres`):

- `./setup-unix-using-docker.sh` — Linux/macOS, sobe api+frontend+bot via Docker Compose
- `./setup-unix-using-pm2.sh` — Linux/macOS, sobe os 3 com PM2, sem Docker
- `./setup-windows-using-docker.sh` — Windows 11 + WSL2, via Docker Desktop
- `./setup-windows-using-pm2.sh` — Windows 11 + WSL2, com PM2, sem Docker

Detalhes de cada um em `docs/setup-unix-using-docker.md`,
`docs/setup-unix-using-pm2.md`, `docs/setup-windows-using-docker.md` e
`docs/setup-windows-using-pm2.md`.

## Convenções de código

- **Sem comentários óbvios.** Só comente o _porquê_ quando não for óbvio pelo
  código (uma restrição escondida, um workaround, um invariante). O código
  existente segue isso à risca — mantenha o padrão.
- **Tabs, não espaços.** Formatação é responsabilidade do Biome
  (`bun run format`), não do editor.
- **Módulos por domínio** em `api/src/modules/<dominio>/`, sempre com o padrão
  `*.routes.ts` (Elysia + validação Zod inline) → `*.service.ts` (regra de
  negócio, testável isolado) → `*.repository.ts` (única camada que toca o
  Prisma). Veja `api/src/modules/transactions/` como referência.
- **Testes ficam ao lado do arquivo testado**: `foo.service.ts` e
  `foo.service.unit.test.ts` no mesmo diretório, não em `__tests__/`.
- **Categorias de transação são um enum fixo** (`transactionCategories` em
  `api/src/modules/transactions/transaction.schema.ts`), não uma tabela no
  banco. Adicionar categoria = editar essa lista **e** `categoryLabels` em
  `frontend/src/lib/categories.ts` **e** em `bot/src/formatting/format.ts`
  (e revisar as paletas de cor do frontend — ver seção de dataviz abaixo).
  Três arquivos, sincronia manual — o bot duplica os rótulos de propósito
  para não depender do workspace do frontend (React/TanStack) só por causa
  de um mapa de strings.

## Como rodar um teste específico

```bash
cd api
bun test src/modules/transactions/transaction.service.unit.test.ts
```

## Antes de abrir PR / dar como pronto

O hook `pre-push` já roda isso automaticamente, mas para checar manualmente:

```bash
(cd api && bunx --bun tsc --noEmit && bun run test:setup && bun run test && bun run build)
(cd frontend && bunx --bun tsc --noEmit && bun run build)
```

Não use `--no-verify` para pular os hooks do Husky sem confirmar com quem pediu a tarefa.
