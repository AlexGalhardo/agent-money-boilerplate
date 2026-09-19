# Changelog

Registro cronológico das mudanças por grupo de trabalho. Datas no formato
AAAA-MM-DD.

---

## Reestruturação do repositório — 2026-09-10

O projeto era uma aplicação Expo/React Native única na raiz. Passou a ser um
repositório com dois pacotes independentes:

- `mobile/` — o app Expo (todo o conteúdo anterior da raiz: `src/`, `app.json`,
  `assets/`, configs).
- `backend/` — nova API (ver Grupo 1). Deployável de forma totalmente
  independente do app.
- `shared/` — schemas Zod e utilitários de dinheiro (`big.js`) compartilhados
  entre os dois via alias `@op/shared` (path no `tsconfig` do backend;
  `watchFolders` do Metro no mobile). Sem dependência `file:` para não quebrar o
  deploy isolado do backend.

`.gitignore` consolidado na raiz. `README.md` original do app preservado em
`mobile/README.md`; o `README.md` da raiz é o novo guia principal (Grupo 6).

---

## Grupo 1 — Migração de framework (NestJS → Elysia) — 2026-09-10

**Contexto:** o repositório nunca teve um backend NestJS. O app era 100% local
(SQLite no dispositivo, hash de senha com `expo-crypto`). "Migrar" aqui
significou **construir o backend-alvo do zero** em Elysia, já no formato descrito
na stack do projeto (Drizzle, JWT+refresh, argon2, otplib, google-auth).

### Adicionado

- **Servidor Elysia** (`backend/`), runtime Bun. Entrada em `src/index.ts`;
  `buildApp()` em `src/app.ts` monta a instância sem escutar porta (usado pelos
  testes via `app.handle(Request)`).
- **Prefixo de versão `/v1`** em todas as rotas de negócio. `GET /health` fora do
  prefixo.
- **Drizzle ORM com dois dialetos** (`src/db/schema.sqlite.ts` e
  `schema.pg.ts`). Mantidos byte-a-byte equivalentes: timestamps como strings
  ISO-8601 UTC, booleanos como inteiros 0/1, mesmos nomes de coluna e índices —
  assim a camada de serviço é escrita uma única vez e roda nos dois drivers.
  `DB_DRIVER=sqlite` (padrão, zero infra) ou `postgres`.
- Migrations geradas para os dois dialetos (`drizzle/sqlite`, `drizzle/pg`);
  runner em `src/db/migrate.ts` (`bun run db:migrate`).
- **Auth própria:** `POST /v1/auth/signup|login|refresh|logout`,
  `forgot-password`, `reset-password`, `GET/PATCH /v1/auth/me`,
  `POST /v1/auth/change-password`, `POST /v1/auth/google`.
  - Argon2id via `Bun.password` (sem dependência nativa de `argon2`).
  - Access token JWT (HS256, 15 min) + refresh token opaco com **rotação**
    (o refresh apresentado é invalidado a cada uso; reuso ⇒ 401).
  - Hash SHA-256 dos refresh/reset tokens no banco (valor cru nunca persistido).
  - Troca de senha e reset revogam todas as sessões do usuário.
  - Google: validação do ID token em `oauth2.googleapis.com/tokeninfo`, checagem
    de `aud` contra `GOOGLE_CLIENT_ID`, upsert por e-mail/`google_id`.
- **2FA (TOTP, `otplib`)** em `/v1/2fa/setup|enable|disable`. `enable` retorna 8
  códigos de recuperação de uso único (hash SHA-256 no banco). Login passa a
  responder `{ twoFactorRequired: true }` (HTTP 200) quando falta o código.
- **Transações:** `GET /v1/transactions` (filtros categoria/busca/período +
  paginação + saldo agregado do mesmo filtro), `GET/POST/PUT/DELETE
  /v1/transactions/:id`. Exclusão é *soft delete* (`deleted_at`) para o sync
  reportar a remoção. Isolamento por usuário em toda query.
- **Sync (protocolo WatermelonDB):** `GET /v1/sync/pull?lastPulledAt=` e
  `POST /v1/sync/push`. Relógio de milissegundos monotônico (`server_seq`) como
  marca d'água. Conflito = last-write-wins; `onConflictDoUpdate ... setWhere
  userId` impede um push mexer em linha de outro usuário.
- **Categorias:** `GET /v1/categories` (catálogo fixo, exposto como endpoint para
  evolução futura sem mudança de contrato).
- Validação de entrada com **Zod** em todas as rotas (`parse()` →
  `AppError(422)` com `fields` `{ "caminho.pontuado": "mensagem" }`).
- `onError` global traduz `AppError` e `ZodError` para o envelope
  `{ error: { code, message, fields? } }`.
- Env validado por Zod em `src/env.ts` (falha rápida no boot).

### Mudanças de contrato em relação ao app local (documentadas)

- **IDs viraram UUID (string)**. O app local usava inteiros autoincrement. UUID
  gerado no cliente permite que uma transação criada offline mantenha
  identidade após o sync.
- **`amount_cents` → `amountCents`** (e demais campos em camelCase) nas respostas
  da API. O app local em SQLite continua com `amount_cents`; o adapter remoto faz
  o mapeamento.
- Datas de transação continuam `YYYY-MM-DD` (string), valores continuam inteiros
  em centavos — sem mudança.

---

## Grupo 2 — Tipagem forte com Zod — 2026-09-10

- Pacote **`shared/`** com os schemas Zod canônicos, consumidos por backend e
  mobile:
  - `common.ts` — primitivos (`amountCents`, `dateOnly`, `email`, `password`,
    paginação, envelope de erro).
  - `auth.ts`, `twofa.ts` — payloads e respostas de autenticação/2FA.
  - `categories.ts`, `transactions.ts` — entidade de transação, input, filtros,
    página, saldo.
  - `sync.ts` — change-set do WatermelonDB.
  - `subscriptions.ts` — planos, preços (`PLAN_PRICING`), assinatura, checkout
    (union discriminada `stripe` | `abacatepay`), cancelamento.
  - `money.ts` — cálculo financeiro com `big.js` (ver Grupo 5).
- Backend: env, todos os `body`/`query`/`params` e todas as respostas tipadas a
  partir de `@op/shared`. `tsc --noEmit` limpo, `strict` + `noUncheckedIndexedAccess`.
- Tipos derivados por `z.infer`, sem `any` na superfície pública.

---

## Grupo 3 — E-mails transacionais (Resend) — 2026-09-10

- `backend/src/modules/email/`:
  - `mailer.ts` — cliente Resend. **Falha de envio é logada e engolida**: o fluxo
    de pagamento nunca quebra porque o e-mail caiu. `EMAIL_DRY_RUN=true` (padrão
    local) apenas loga. `outbox` em memória para os testes.
  - `templates.ts` — HTML+texto simples com dados dinâmicos (nome, valor
    formatado, plano, data de acesso): boas-vindas, redefinição de senha,
    pagamento confirmado, pagamento falhou, assinatura cancelada, assinatura
    renovada.
- Disparos ligados aos fluxos: signup (boas-vindas), forgot-password (link com
  token; em não-produção o token também volta no corpo da resposta como
  `devToken` para testes/local), e às transições de assinatura (Grupo 4).
- Envios não-críticos usam `queueEmail` (fire-and-forget).

---

## Grupo 4 — Assinaturas: Stripe (cartão) + AbacatePay (PIX) — 2026-09-10

### Planos

| Plano  | BRL     | USD     |
|--------|---------|---------|
| Mensal | R$ 4,99 | US$ 2,99 |
| Anual  | R$ 49,90 | US$ 29,90 |

Tabela canônica em `shared/src/subscriptions.ts` (`PLAN_PRICING`, em centavos).

### Modelagem

Tabela `subscriptions` (plano, status, método, provider, moeda, valor, IDs do
provider, início/fim do período, `cancel_at_period_end`, `canceled_at`).
Tabelas de apoio: `pix_invoices` (cobranças PIX) e `payment_events`
(idempotência + auditoria de webhook, único por `(provider, event_id)`).

Status: `incomplete` → `pending` (PIX aguardando) → `active` → `past_due` /
`canceled` (fim de período) / `expired`.

### Stripe (cartão, recorrente)

- `POST /v1/subscriptions/checkout` com `paymentMethod: "card"` cria um Customer,
  uma Checkout Session (`mode: subscription`, Price pré-criado por
  plano+moeda via env `STRIPE_PRICE_*`) e uma linha local `incomplete`; retorna
  `checkoutUrl`.
- `POST /v1/webhooks/stripe` valida a assinatura (`constructEventAsync`),
  deduplica por `event.id` e trata `checkout.session.completed`,
  `customer.subscription.created|updated|deleted`, `invoice.payment_failed`.
  Atualiza status/período e dispara e-mail (confirmado / renovado / falhou).

### AbacatePay (PIX)

**Decisão (obrigatória — a AbacatePay não tem assinatura PIX nativa):** modelo
*renovação por fatura*. O checkout PIX (`POST /transparents/create`, API v2,
valores em centavos) gera uma cobrança única do período; o webhook
`transparent.completed` ativa/estende a assinatura por 30 dias (mensal) ou 365
(anual). Próximo da expiração deve ser emitida uma nova cobrança PIX e enviado
e-mail de lembrete (endpoint/rotina de renovação a agendar — ver README /
pendências). Sem pagamento até `current_period_end`, a assinatura vira
`expired`.

- `POST /v1/subscriptions/checkout` com `paymentMethod: "pix"` → linha `pending`
  + `pix_invoices` + retorno com `pixCode` (copia-e-cola) e `pixQrImage`
  (`data:image/png;base64,...`).
- `POST /v1/webhooks/abacatepay` valida HMAC-SHA256 do corpo cru contra
  `ABACATEPAY_WEBHOOK_SECRET`, deduplica, e em `transparent.completed` /
  `checkout.completed` ativa a assinatura e dispara o e-mail de confirmação.
- PIX disponível apenas em BRL (validado no checkout).

### Rotas de leitura/gestão

- `GET /v1/subscriptions/plans` (público) — catálogo com preços.
- `GET /v1/subscriptions/me` — assinatura atual + `isPremium` (derivado de
  status + `current_period_end`).
- `POST /v1/subscriptions/cancel` — `atPeriodEnd` (padrão) mantém acesso até o
  fim do período pago; `false` encerra na hora. Cartão propaga para o Stripe.

---

## Grupo 5 — Testes automatizados (backend) — 2026-09-10

- **Unidade** (`bun test tests/unit`): `shared/src/money.ts` com `big.js` —
  saldo, conversão de moeda, juros simples e compostos, rateio de centavos,
  arredondamento *half-up* exaustivo (tabela de casos incluindo `.5`, negativos,
  strings). 26 casos.
- **Integração/API** (`bun test tests/integration`): auth (signup/login/refresh
  com rotação/reset/2FA-gate), transações (CRUD, filtros, saldo, isolamento
  entre usuários, validação 422), 2FA (setup→enable→challenge→login→disable por
  código de recuperação), sync (round-trip pull/push, checkpoint incremental,
  proteção entre usuários), assinaturas (catálogo, PIX checkout+webhook+ativação,
  webhook duplicado no-op, assinatura inválida 400, Stripe checkout+webhook+
  cancelamento). Providers Stripe/AbacatePay mockados via `mock.module` — nenhum
  serviço pago é tocado.
- Bootstrap de teste (`tests/setup.ts`, `bunfig.toml` preload): SQLite temporário
  + migrations reais antes de cada execução.
- Total: **47 testes / 122 asserts**, verdes.
- `bun run typecheck` limpo.

### Mobile

- **Camada de dados por adapters** (`mobile/src/data/`): interfaces `AuthRepo`,
  `TransactionRepo`, `SubscriptionRepo`; implementação `local/` (SQLite no
  dispositivo, offline-first, reaproveitando `src/lib/`) e `remote/` (API via
  `fetch` + `expo-secure-store` para tokens, com refresh automático no 401).
  `data/index.ts` escolhe uma das duas por `EXPO_PUBLIC_DATA_MODE` (`local` |
  `remote`). As telas nunca sabem qual está ativa.
- **TanStack Query** como camada de dados das telas nos dois modos
  (`src/query/`): hooks `useTransactionsQuery`/mutations,
  `usePlans`/`useSubscription`/`useCheckout`/`useCancelSubscription`. `AuthProvider`
  reescrito sobre `repos.auth`.
- Novas telas: **assinatura** (escolher plano/moeda/método, ver status atual,
  cancelar, exibir PIX copia-e-cola), **2FA** (setup → enable com códigos de
  recuperação → disable), **recuperar senha** e **redefinir senha**. Login passa
  a tratar o desafio 2FA.
- Config pública validada por Zod (`src/config/env.ts`).
- `shared/src/money.ts` e `format.ts` passam a ser importados pelo mobile
  (`@op/shared` via `watchFolders` do Metro).
- Mudança visível: `user.id` agora é string (UUID no modo remoto); ids de
  transação são strings. Telas `dashboard` e `transaction/[id]` migradas para os
  hooks.
- Ajustes de acessibilidade em `Button`/`TextField` (`accessibilityRole`,
  `accessibilityLabel`, `testID`) — usados pelos testes e pelos fluxos Maestro.

### Testes do mobile

- **Unidade (Jest / `jest-expo`)**: `src/__tests__/money.test.ts` — mesma bateria
  de `big.js` do backend, rodando no ambiente do app.
- **Componente (React Native Testing Library)**:
  - `transaction-form.test.tsx` — criação de transação a partir da máscara BRL +
    categoria; bloqueio de submit abaixo do mínimo.
  - `login-2fa.test.tsx` — login que recebe `twoFactorRequired`, exibe o campo de
    código e conclui com o TOTP; mensagem de erro em credencial inválida.
  - `subscription-screen.test.tsx` — renderização dos planos com preços,
    alternância mensal/anual, PIX desabilitado em USD, início de checkout.
- `@testing-library/react-native` fixado em `13.3.3` (a 14.0.1 quebra o
  `render()` nesta combinação Expo SDK 57 / React 19.3); `react-test-renderer`
  alinhado a `19.2.3`.
- 18 testes de mobile, verdes.

## Grupo 6 — `.env.example` e README — 2026-09-10

- `.env.example` por pacote (`backend/`, `mobile/`) com comentário curto em cada
  variável explicando onde obtê-la; `.env.example` na raiz só aponta para os
  dois. `.gitignore` da raiz ignora todo `.env*` exceto `*.example`.
- `README.md` da raiz: visão geral + stack pós-Elysia, modo rápido (SQLite, sem
  Docker) para backend e para os dois modos do mobile, modo produção-local
  (Postgres via `docker compose`, migrations, imagem Docker do backend), tabela
  de credenciais de teste (Google, Resend, Stripe test mode, AbacatePay sandbox),
  como rodar cada camada de teste, e build de produção EAS + checklist pré-Play
  Store.
- `backend/docker-compose.yml` (Postgres 17) e `backend/Dockerfile`
  (imagem standalone, contexto = raiz, contratos `shared/` vendorizados).
- `scripts/test-all.mjs` + `bun run test:all` na raiz: type-check dos 3 pacotes +
  `bun test` do backend + `jest` do mobile. Maestro fica de fora (precisa de
  device).
- `e2e/smoke.yaml` (modo local, sem backend) e `e2e/flow.yaml` (fluxo de
  aceitação completo com backend + sandbox), com `e2e/README.md`.

## Stack Docker completa — 2026-09-10

Objetivo: `docker compose up` sobe **API + PostgreSQL + app (web build) em modo
online** sem configuração local, com os mesmos comandos no Windows 10/11 e no
Unix.

### Adicionado

- **`docker-compose.yml`** na raiz — serviços `db` (Postgres 17), `backend`
  (Elysia), `web` (build web do Expo servido por nginx), `metro`
  (perfil `native`, Expo dev server para aparelho físico) e `migrate`
  (perfil `tools`, one-shot). `DATABASE_URL` no `.env` (para o `db` embutido ou
  um banco gerenciado); `POSTGRES_*` configuram o container `db`.
- **`docker-compose.override.yml`** — auto-merge só em `docker compose up`:
  hot-reload do backend (`bun --watch`, bind-mounts), porta do Postgres exposta,
  `NODE_ENV=development`. `docker compose -f docker-compose.yml up` roda o modo
  produção.
- **`backend/Dockerfile`** reescrito: contexto = raiz, layout `/app/backend` +
  `/app/shared` (o path `@op/shared` resolve sem rewriting); targets `dev` e
  `prod` (usuário não-root, healthcheck, migrate no boot).
- **`docker/mobile-web.Dockerfile`** — `bunx expo export --platform web` →
  `nginx:alpine`. `EXPO_PUBLIC_*` entram como build args (embutidos no bundle);
  o alvo do proxy (`BACKEND_ORIGIN`) é injetado em runtime via `envsubst`.
- **`docker/nginx.conf`** — SPA fallback + proxy same-origin `/api/` → `backend`
  (sem CORS), cache longo para `/_expo/` e `/assets/`.
- **`.env.example`** na raiz vira o arquivo único da stack (copiar para `.env`,
  que o Compose carrega sozinho): portas, Postgres, runtime do backend,
  Google/Resend/Stripe/AbacatePay, `EXPO_PUBLIC_*` do build web e vars do perfil
  nativo (`LAN_HOST`, `EXPO_PUBLIC_API_URL_NATIVE`).
- **`Makefile`** + **`scripts/stack.ps1`** — mesmos verbos
  (`up`/`prod`/`down`/`logs`/`migrate`/`psql`/`rebuild-web`/`native`/`clean`)
  para Unix e para Windows PowerShell.
- **`.gitattributes`** — normaliza fim de linha (LF em Dockerfiles, `*.sh`,
  `Makefile`, YAML; CRLF em `*.ps1`), elimina os avisos de CRLF do Git no
  Windows.
- **`.dockerignore`** revisado: passa a incluir `mobile/` e `shared/` no
  contexto (necessários para a imagem web), continua excluindo
  `node_modules`, `.expo`, `dist`, `.env*` (exceto `.env.example`), `.git`.

### Alterado no mobile (para o build web ser determinístico)

- `src/data/index.ts` passa a carregar o adapter ativo com `require` (o inativo
  nunca é avaliado) — no modo `remote` o `expo-sqlite` do adapter local não é
  executado.
- `metro.config.js`: no target `web`, `expo-sqlite` é redirecionado para
  `src/lib/sqlite-web-stub.js` (o modo web roda sempre em `remote`).
- `bun run test:all` e os 65 testes continuam verdes; type-check limpo.
