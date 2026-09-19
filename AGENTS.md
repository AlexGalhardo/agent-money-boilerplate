# CLAUDE.md

Guia para o Claude Code (e outros agentes de IA) trabalhando neste repositório.

## IMPORTANTE

- Não crie nem edite nenhum arquivo changelod.md

## O que é este projeto

**Elysia Finanças** — controle de finanças pessoais (transações, categorias,
relatórios visuais). Monorepo Bun com quatro workspaces (`backend`,
`frontend`, `bot`, `mobile`) mais dois clientes que consomem a mesma API sem
serem workspace próprio (`bot` e `mobile` importam `@elysia-galhardo-finances/backend`
diretamente):

```
/backend/       → ElysiaJS (REST API, auth, pagamentos, cron)
/frontend/      → TanStack Start (SSR)
/bot/           → bot do Telegram (reusa Prisma/criptografia/regras da API)
/mobile/        → Expo + React Native (mesma API do frontend/bot, sem backend próprio)
/http-client/   → chamadas HTTP de referência (api.http)
/docs/          → guias de setup e deploy
```

Tipagem ponta-a-ponta entre API e frontend via [Eden](https://elysiajs.com/eden/overview.html)
(`frontend/src/lib/api.ts` e `mobile/src/lib/api.ts` importam o tipo `App`
exportado por `backend/src/server.ts`) — qualquer rota nova na API já fica
tipada nos dois sem gerar nada.

## Stack

| Camada        | Tecnologia                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Runtime / API | Bun + ElysiaJS                                                                                   |
| ORM           | Prisma (schema duplicado: `schema.sqlite.prisma` e `schema.postgresql.prisma` — ver nota abaixo) |
| Validação     | Zod                                                                                              |
| Autenticação  | better-auth (sessão via cookie, plugin de 2FA opcional)                                          |
| Frontend      | TanStack Start + Tailwind CSS v4                                                                 |
| Mobile        | Expo + React Native + NativeWind (sessão via @better-auth/expo, sem backend próprio)             |
| Testes        | `bun:test` (unit/integration/smoke) + Playwright (E2E)                                           |
| Lint/format   | Biome (tabs, largura de linha 120)                                                               |

## Comandos essenciais

Rodar a partir da raiz do monorepo:

```bash
bun install                 # instala tudo (workspaces)
bun run backend:dev         # API em http://localhost:4000
bun run frontend:dev        # frontend em http://localhost:4001
bun run mobile:dev          # Expo dev server (Metro) — escaneie o QR com o Expo Go
bun run lint                # biome check
bun run typecheck:backend   # tsc --noEmit da API
bun run typecheck:frontend  # tsc --noEmit do frontend
bun run typecheck:mobile    # tsc --noEmit do app mobile
```

`bunfig.toml` fixa `install.linker = "hoisted"` (uma árvore única de
`node_modules`, em vez do "isolated" padrão do bun) — sem isso, o mesmo
pacote (ex: `elysia`) pode instalar como duas cópias fisicamente diferentes
em workspaces com conjuntos de dependências muito distintos (ex:
`backend/` vs `mobile/`, que traz todo o ecossistema Expo/React Native),
fazendo o TypeScript enxergar tipos nominalmente incompatíveis ao importar
`App` do backend via Eden em mais de um workspace. Não remova essa config
sem entender essa implicação.

Dentro de `backend/`:

```bash
bun run test:unit           # só *.unit.test.ts, sem precisar de banco
bun run test                # unit + integration (sobe um banco sqlite de teste primeiro)
bun run db:seed             # popula o banco (ver "Usuários de seed" abaixo)
bun run db:deploy && bun run db:generate   # aplica migrations + gera o Prisma Client
```

Setup completo do zero, 4 variantes conforme SO e uso ou não de Docker (todas
perguntam interativamente SQLite ou Postgres, ou aceitam o banco como
argumento para pular a pergunta — ex: `./setup-unix-using-docker.sh postgres`):

- `./setup-unix-using-docker.sh` — Linux/macOS, sobe backend+frontend+bot via Docker Compose
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
- **Módulos por domínio** em `backend/src/modules/<dominio>/`, sempre com o padrão
  `*.routes.ts` (Elysia + validação Zod inline) → `*.service.ts` (regra de
  negócio, testável isolado) → `*.repository.ts` (única camada que toca o
  Prisma). Veja `backend/src/modules/transactions/` como referência.
- **Testes ficam ao lado do arquivo testado**: `foo.service.ts` e
  `foo.service.unit.test.ts` no mesmo diretório, não em `__tests__/`.
- **Categorias de transação são um enum fixo** (`transactionCategories` em
  `backend/src/modules/transactions/transaction.schema.ts`), não uma tabela no
  banco. Adicionar categoria = editar essa lista **e** `categoryLabels` em
  `frontend/src/lib/categories.ts` **e** em `bot/src/formatting/format.ts`
  (e revisar as paletas de cor do frontend — ver seção de dataviz abaixo).
  Três arquivos, sincronia manual — o bot duplica os rótulos de propósito
  para não depender do workspace do frontend (React/TanStack) só por causa
  de um mapa de strings.
- **Erros do better-auth nunca vão pra tela/chat em inglês.** `error.message`
  do better-auth é sempre inglês e instável entre versões — use sempre
  `error.code` traduzido por um mapa local: `frontend/src/lib/auth-errors.ts`
  (`translateAuthError(error, fallback)`) e `bot/src/lib/auth-errors.ts`
  (mesmo mapa, duplicado pelo mesmo motivo de `categoryLabels` acima). Regras
  de senha (8-32 caracteres + complexidade) também duplicadas em
  `frontend/src/components/password-strength-input.tsx` e
  `bot/src/lib/password-rules.ts` — mantenha os três mapas em sincronia ao
  adicionar/alterar um error code ou regra de senha.
- **Login com Google dentro do bot do Telegram** não é possível sem sair do
  chat (OAuth exige navegador). O fluxo é: `bot/src/lib/auth-flows.ts` gera
  um token de uso único (`backend/src/modules/telegram/telegram.service.ts`,
  model `TelegramLinkToken`, expira em 15min) e manda um link pra
  `frontend/src/routes/telegram-vincular.tsx`; essa página, já autenticada,
  chama `POST /telegram/link` (`backend/src/modules/telegram/telegram.routes.ts`)
  pra vincular o chat à conta. O bot só volta a saber que deu certo quando o
  usuário toca em "verificar vínculo" (poll manual, sem push do backend pro bot).

## Como rodar um teste específico

```bash
cd backend
bun test src/modules/transactions/transaction.service.unit.test.ts
```

## Antes de abrir PR / dar como pronto

O hook `pre-push` já roda isso automaticamente, mas para checar manualmente:

```bash
(cd backend && bunx --bun tsc --noEmit && bun run test:setup && bun run test && bun run build)
(cd frontend && bunx --bun tsc --noEmit && bun run build)
```

Não use `--no-verify` para pular os hooks do Husky sem confirmar com quem pediu a tarefa.
