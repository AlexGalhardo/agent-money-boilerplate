# CLAUDE.md

Guia para o Claude Code (e outros agentes de IA) trabalhando neste repositório.

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

| Camada | Tecnologia |
|---|---|
| Runtime / API | Bun + ElysiaJS |
| ORM | Prisma (schema duplicado: `schema.sqlite.prisma` e `schema.postgresql.prisma` — ver nota abaixo) |
| Validação | Zod |
| Autenticação | better-auth (sessão via cookie, plugin de 2FA opcional) |
| Frontend | TanStack Start + Tailwind CSS v4 |
| Testes | `bun:test` (unit/integration/smoke) + Playwright (E2E) |
| Lint/format | Biome (tabs, largura de linha 120) |

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

- **Sem comentários óbvios.** Só comente o *porquê* quando não for óbvio pelo
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

## Coisas que vão te morder se você não souber

- **Dois schemas Prisma.** `api/prisma/schema.sqlite.prisma` (dev local) e
  `schema.postgresql.prisma` (produção/Postgres) precisam ter os **mesmos
  models sempre** — o comentário no topo do arquivo já avisa disso. Se você
  mudar um `model`, replique no outro arquivo manualmente; não há um schema
  único parametrizado porque o Prisma não aceita `provider` dinâmico via `env()`.
- **`description` e `amount` de `Transaction` são criptografados** (AES-256-GCM,
  `api/src/lib/encryption.ts`) antes de persistir. Isso significa que busca por
  texto (`search`) e paginação em `transaction.service.ts` acontecem **em
  memória**, depois de descriptografar tudo do usuário — aceitável no volume
  desta aplicação, mas não tente empurrar esse filtro para uma query Prisma
  (o banco não enxerga o texto plano).
- **`ENCRYPTION_KEY` e `BETTER_AUTH_SECRET`** são hex de 64 caracteres (32
  bytes). Os scripts `setup-*.sh` geram os dois com `openssl rand -hex 32`
(ou, sem `openssl` disponível, via `crypto` do Node embutido no Bun — ver
`scripts/common.sh`). Sem eles
  corretamente formatados, `api/src/config/env.ts` recusa subir o processo.
- **Variável opcional vazia no `.env` (`FOO=`) vira `""`, não `undefined`** —
  isso já mordeu uma vez (`RESEND_FROM_EMAIL=` quebrava `z.email().optional()`
  na config). `loadEnv()` em `api/src/config/env.ts` normaliza string vazia
  para `undefined` antes de validar; se adicionar uma env var opcional nova
  com validador de formato (email, url, etc.), esse normalizador já cobre.
- **Dois usuários de seed** (`api/prisma/seed.ts`), propósitos diferentes —
  não misture:
  - `admin@gmail.com` / `adminBR@123` — 500 transações aleatórias, usado pelos
    testes E2E (`frontend/e2e/*.spec.ts` fazem login com essas credenciais
    literalmente) e para demonstração. **Não remova nem renomeie** sem
    atualizar os specs do Playwright.
  - `aleexgvieira@gmail.com` / `galhardyn` — conta pessoal do dono do projeto,
    criada **sem** transações de exemplo, pensada para uso real local via o
    botão "Importar" do dashboard.
- **Importação de CSV do Nubank** (`api/src/modules/transactions/transaction-import.*`)
  categoriza por regex sobre a descrição (`CATEGORY_RULES`), em ordem — a
  primeira que casar vence. Transação que não casa nenhuma regra cai em
  `other` e volta marcada como `needsReview: true` para o usuário escolher a
  categoria na tela de revisão antes de confirmar; a API nunca inventa uma
  categoria nova sozinha. Ao adicionar uma regra nova, cuidado com
  correspondência parcial de palavra (ex: `SEGURO` sem `\b` nos dois lados
  casava dentro de `PAGSEGURO` — já corrigido, mas é a classe de bug mais
  fácil de reintroduzir aqui).
- **Um hash bcrypt (`$2b$10$...`) não pode ir cru num `.env`** — tanto o
  parser de `.env` do Bun quanto o do Docker Compose tentam expandir `$` como
  referência de variável (com sintaxes de escape diferentes e incompatíveis
  entre si), e silenciosamente viram o valor em string vazia. `bot/.env`
  guarda `BOT_PASSWORD_HASH_BASE64` (base64 do hash) por causa disso — ver
  `bot/src/config/env.ts` e `bot/scripts/hash-password.ts`. Qualquer segredo
  novo com caracteres especiais merece o mesmo tratamento.
- **2FA não é aplicado em login via Google.** O plugin `twoFactor` do
  better-auth só intercepta `/sign-in/email|username|phone-number` — não o
  callback OAuth (`/callback/:id`). Usuário com 2FA ativo (`ENABLE_2FA=true`)
  que loga com Google entra direto, sem o desafio de 6 dígitos. Documentado
  em `docs/autenticacao.md`; não implementado via hack porque exigiria
  duplicar lógica interna privada do plugin (nomes de cookie e chamadas de
  `internalAdapter` fora da API pública), frágil a upgrades.
- **O desafio de 2FA no login é um modal (`TwoFactorModal`), não uma
  página.** `frontend/src/lib/auth-client.ts` configura `twoFactorClient()`
  **sem** `onTwoFactorRedirect`/`twoFactorPage` de propósito — se você
  adicionar de volta, o plugin volta a navegar para uma URL fixa em vez de
  deixar `entrar.tsx` abrir o modal com o `twoFactorRedirect`/
  `twoFactorMethods` que já vêm na resposta de `signIn.email()`.
- **`Transaction.date` ≠ `Transaction.createdAt`.** `date` (novo, Fase 5) é a
  data real da transação, editável no formulário e usada por filtros/
  ordenação (`from`/`to`, `orderBy` em `transaction.repository.ts`).
  `createdAt` continua sendo só "quando o registro foi criado no banco".
  Qualquer código novo que precise da data "da transação" (relatórios,
  bot, export) deve usar `date`, não `createdAt`.
- **A busca do dashboard (`Buscar por nome`) roda inteira no cliente**, via
  fuse.js sobre o resultado já filtrado por categoria/data vindo do
  servidor (`perPage: 1000` fixo em `dashboard/index.tsx`, não é a página
  atual). O parâmetro `search` que `transaction.service.ts` ainda aceita
  (busca em memória no servidor) não é mais usado pelo frontend — existe
  só porque a API continua suportando, não porque algo depende dele hoje.
- **Dashboard usa gráficos de pizza (Recharts) por categoria** em
  `frontend/src/components/category-pie-chart.tsx`. A paleta categórica é
  fixa em 8 matizes (`buildColorMap` em `frontend/src/lib/categories.ts`) —
  **nunca invente uma 9ª cor**; categorias sem slot reservado já caem
  graciosamente em cinza neutro (`#898781`) com o nome ainda visível na
  legenda. Ver skill `dataviz` antes de mexer em cores de gráfico.

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
