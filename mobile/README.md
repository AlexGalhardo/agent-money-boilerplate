# op — App de finanças pessoais

Monorepo com dois pacotes que fazem deploy de forma independente:

```
op/
├── backend/     API Elysia (Bun) + Drizzle ORM — assinaturas, auth, 2FA, sync, e-mails
├── mobile/      App Expo / React Native (SDK 57)
├── shared/      Schemas Zod + cálculo financeiro (big.js), compartilhados pelos dois
├── e2e/         Fluxos Maestro
└── scripts/     Orquestração de testes
```

## Visão geral da stack (pós-migração)

| Camada | Tecnologia |
|---|---|
| Backend | **Elysia** sobre **Bun**; roteamento por módulos, validação Zod em toda rota |
| ORM | **Drizzle ORM** — SQLite (modo rápido) **ou** PostgreSQL (modo produção), mesmo código |
| Auth | JWT (HS256, acesso 15 min) + refresh token opaco com rotação; **Argon2id** (`Bun.password`) |
| 2FA | TOTP (`otplib`) + códigos de recuperação de uso único |
| Login Google | validação de ID token em `oauth2.googleapis.com/tokeninfo` |
| Sync offline↔online | protocolo WatermelonDB (`/sync/pull`, `/sync/push`), relógio `server_seq` |
| Pagamentos | **Stripe** (cartão, assinatura recorrente) + **AbacatePay** (PIX, renovação por fatura) |
| E-mails | **Resend** (com modo dry-run); falha de envio nunca quebra o fluxo de pagamento |
| App mobile | Expo Router, NativeWind, **TanStack Query**, Zustand (estado local), `expo-secure-store` |
| Dados no mobile | camada de adapters: **SQLite local (offline-first)** ou **API remota**, trocada por env |
| Tipos | `zod` como validador único; schemas compartilhados via `@op/shared` |

> A tabela de "stack atual" do enunciado descrevia um alvo que ainda não existia
> no repositório (era um app Expo puro, 100% local). O backend foi **construído do
> zero** já nesse formato. Detalhes e mudanças de contrato: `CHANGELOG.md`.

---

## Pré-requisitos

- [Bun](https://bun.sh) ≥ 1.2 (backend, shared, testes)
- Node ≥ 20 e um emulador/simulador ou o app **Expo Go** (mobile)
- Opcional: Docker (modo Postgres), [Maestro](https://maestro.mobile.dev) (E2E),
  [Stripe CLI](https://stripe.com/docs/stripe-cli) (webhooks locais)

Instale as dependências dos três pacotes:

```bash
cd shared  && bun install && cd ..
cd backend && bun install && cd ..
cd mobile  && bun install && cd ..
```

---

## Modo rápido — SQLite (sem Docker)

O caminho mínimo para rodar tudo localmente.

### 1. Backend

```bash
cd backend
cp .env.example .env          # os defaults já apontam para SQLite + EMAIL_DRY_RUN
bun run db:migrate            # cria ./op.sqlite a partir de drizzle/sqlite
bun run dev                   # http://localhost:3333  (GET /health)
```

Nada além disso é obrigatório: sem Stripe/AbacatePay/Resend o servidor sobe e as
rotas que não são de pagamento funcionam. E-mails vão para o console
(`EMAIL_DRY_RUN=true`).

### 2. Mobile

Dois modos, escolhidos por `EXPO_PUBLIC_DATA_MODE`:

**a) Offline-first (padrão, não precisa do backend):**

```bash
cd mobile
cp .env.example .env          # EXPO_PUBLIC_DATA_MODE=local
bun run start                 # escaneie o QR com o Expo Go
```

Tudo (auth, transações, saldo) roda no SQLite do dispositivo. Assinaturas e 2FA
mostram um aviso pedindo o modo online.

**b) Online-first (contra o backend):**

```bash
cd mobile
# .env:
#   EXPO_PUBLIC_DATA_MODE=remote
#   EXPO_PUBLIC_API_URL=http://10.0.2.2:3333   # emulador Android → host
#   (dispositivo físico: use o IP da sua máquina na LAN)
bun run start
```

Auth, transações e assinaturas passam a ir pela API via TanStack Query; o SQLite
local vira cache.

---

## Docker — a stack inteira em um comando

Sobe **API + PostgreSQL + app (web build) em modo online**, sem configurar nada
localmente. Os comandos são idênticos no Windows 10/11 (Docker Desktop /
PowerShell) e no Unix/macOS. Requer Docker Compose v2.20+.

```bash
cp .env.example .env      # uma vez — edite os segredos de produção
docker compose up -d --build
```

| | URL | Observação |
|---|---|---|
| App | http://localhost:8081 | Expo web build servido por nginx |
| API | http://localhost:3333 | também usada por webhooks e pelo app nativo |
| Postgres | localhost:5432 | só exposto em dev (`docker-compose.override.yml`) |

O app web chama a API **na mesma origem** (`/api` → proxy do nginx → `backend`),
então não há CORS nem nada a configurar localmente. Migrations rodam sozinhas no
boot do `backend` (são idempotentes).

### Atalhos

| Make (Unix/WSL/Git-Bash) | PowerShell (Windows) | Ação |
|---|---|---|
| `make up` | `./scripts/stack.ps1 up` | build + sobe tudo |
| `make prod` | `./scripts/stack.ps1 prod` | igual, **ignorando** o override de dev |
| `make logs` | `./scripts/stack.ps1 logs` | acompanha os logs |
| `make migrate` | `./scripts/stack.ps1 migrate` | roda migrations manualmente |
| `make rebuild-web` | `./scripts/stack.ps1 rebuild-web` | rebuild do app após mudar `EXPO_PUBLIC_*` |
| `make psql` | `./scripts/stack.ps1 psql` | shell no Postgres |
| `make clean` | `./scripts/stack.ps1 clean` | derruba tudo **e apaga o banco** |

### Produção

```bash
docker compose -f docker-compose.yml up -d --build   # sem o override de dev
```

- Preencha no `.env`: `POSTGRES_PASSWORD`, `JWT_*` (novos!), chaves live de
  Stripe/AbacatePay, `RESEND_API_KEY` + `EMAIL_DRY_RUN=false`, `APP_URL` e
  `WEB_APP_URL` com os domínios reais.
- `EXPO_PUBLIC_API_URL` é **embutido no build** do app. Para deploy separado
  (app e API em domínios diferentes) aponte para `https://api.seudominio.com` e
  rode `docker compose build web`. Para servir tudo no mesmo domínio, mantenha
  `.../api` e ponha um TLS/ingress na frente do serviço `web`.
- Webhooks apontam para a API **diretamente**:
  `https://api.seudominio.com/v1/webhooks/{stripe,abacatepay}`.
- Banco gerenciado (RDS/Neon/etc.): aponte `DATABASE_URL` no `.env` para ele e
  suba só `docker compose up -d backend web`.
- Imagens isoladas, se quiser publicar em um registry:
  ```bash
  docker build -f backend/Dockerfile           -t op-backend:latest .
  docker build -f docker/mobile-web.Dockerfile -t op-web:latest \
    --build-arg EXPO_PUBLIC_API_URL=https://api.seudominio.com .
  ```

### App nativo (Expo Go) via Docker

O `.aab`/`.apk` de produção continua vindo do EAS (seção abaixo). Para rodar o
app **nativo** num aparelho durante o desenvolvimento, o perfil `native` sobe o
Metro:

```bash
# .env: LAN_HOST e EXPO_PUBLIC_API_URL_NATIVE com o IP da sua máquina no Wi-Fi
make native            # ou: docker compose --profile native up -d --build
# abra  exp://<LAN_HOST>:8082  no Expo Go
```

### Modo "produção local" sem Docker (só o Postgres)

```bash
docker compose -f backend/docker-compose.yml up -d     # apenas Postgres 17
cd backend
# .env: DB_DRIVER=postgres  DATABASE_URL=postgres://op:op@localhost:5432/op
bun run db:migrate && bun run dev
```

Trocar de dialeto **não muda nenhuma query** — os dois schemas Drizzle
(`src/db/schema.sqlite.ts` e `schema.pg.ts`) são mantidos equivalentes (timestamps
como string ISO, booleanos 0/1). Regenerar migrations após mexer no schema:

```bash
bun run db:generate                                      # SQLite
DB_DRIVER=postgres DATABASE_URL=... bun run db:generate   # Postgres
```

---

## Credenciais de teste

Todas opcionais para o modo rápido; necessárias para exercitar pagamentos/e-mails.
Cada variável está comentada em `backend/.env.example`.

| Serviço | Onde obter | Variáveis |
|---|---|---|
| **Google** | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Web Client ID | `GOOGLE_CLIENT_ID` (backend), `EXPO_PUBLIC_GOOGLE_*` (mobile) |
| **Resend** | [resend.com/api-keys](https://resend.com/api-keys) | `RESEND_API_KEY`, `EMAIL_FROM`; deixe `EMAIL_DRY_RUN=true` para não enviar |
| **Stripe (test mode)** | [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) | `STRIPE_SECRET_KEY` (`sk_test_…`), `STRIPE_PRICE_*` (crie 1 Price recorrente por plano+moeda), `STRIPE_WEBHOOK_SECRET` |
| **Stripe webhooks locais** | `stripe listen --forward-to localhost:3333/v1/webhooks/stripe` | usa o `whsec_…` que o comando imprime |
| **AbacatePay (sandbox)** | [app.abacatepay.com](https://app.abacatepay.com) → chave de desenvolvimento | `ABACATEPAY_API_KEY`, `ABACATEPAY_WEBHOOK_SECRET` (defina ao registrar o webhook em `POST /webhooks/create`) |

Confirmar um pagamento PIX no sandbox: `POST https://api.abacatepay.com/v2/transparents/simulate-payment`
com o `billingId`, ou o botão "simular" no painel.

---

## Testes

Um comando roda tudo o que é viável localmente sem serviço pago
(sandbox/mocks apenas):

```bash
bun run test:all        # type-check dos 3 pacotes + backend (bun test) + mobile (jest)
```

Por camada:

| Camada | Comando | O que cobre |
|---|---|---|
| **Unidade** (Jest / bun) | `cd mobile && bun run test` · `cd backend && bun test tests/unit` | `shared/src/money.ts` com `big.js` — saldo, conversão de moeda, juros simples/compostos, rateio, arredondamento *half-up* exaustivo |
| **Componente** (RNTL) | `cd mobile && bun run test` | CRUD de transação, login + desafio 2FA, telas de assinatura (seleção de plano/moeda/método, início de checkout) |
| **Integração / API** | `cd backend && bun test tests/integration` | rotas Elysia: auth (signup/login/refresh com rotação/reset), transações (filtros, saldo, isolamento), 2FA, sync (pull/push, incremental), assinaturas (PIX + Stripe, webhooks, idempotência). Providers mockados. |
| **E2E** (Maestro) | `maestro test e2e/smoke.yaml` (local) · `maestro test e2e/flow.yaml` (online + sandbox) | cadastro → login → 2FA → transação offline → reconectar → sync → assinar (PIX sandbox) → acesso premium. Ver `e2e/README.md`. |

Estado atual: **47 testes de backend + 18 de mobile**, verdes; type-check limpo
nos três pacotes. O E2E precisa de device/emulador e não entra no `test:all`.

---

## Build de produção do app (EAS)

O `mobile/app.json` ainda usa os defaults do template — antes do primeiro build
defina identidade e credenciais:

1. `app.json` → `expo.ios.bundleIdentifier` e `expo.android.package`
   (ex.: `com.suaempresa.op`), `expo.version`, `expo.android.versionCode`.
2. `eas.json` (crie com `eas build:configure`) com um profile `production` e um
   `preview` (internal distribution).
3. Variáveis: `eas env:create` para `EXPO_PUBLIC_DATA_MODE=remote`,
   `EXPO_PUBLIC_API_URL=https://<sua-api>` e os `EXPO_PUBLIC_GOOGLE_*`.
4. `eas login` && `eas init` (grava `extra.eas.projectId`).

```bash
cd mobile
eas build --profile preview  --platform android   # APK/AAB interno para testar
eas build --profile production --platform android # AAB para a Play Store
eas submit --profile production --platform android
```

### Checklist mínimo antes de submeter à Google Play

- [ ] `bundleIdentifier`/`package` definitivos e **imutáveis** definidos
- [ ] `versionCode` incrementado a cada envio (ou `autoIncrement` no `eas.json`)
- [ ] Ícones e splash reais (hoje são os do template em `assets/images/`)
- [ ] `EXPO_PUBLIC_API_URL` apontando para a API **de produção** (HTTPS)
- [ ] Backend de produção no ar, com HTTPS, CORS restrito e migrations aplicadas
- [ ] Segredos de produção configurados no host da API (nunca no bundle do app)
- [ ] Stripe/AbacatePay em **modo live** com webhooks apontando para a API de produção
- [ ] Política de privacidade publicada (obrigatória — app coleta e-mail e dados financeiros)
- [ ] Data Safety form do Play Console preenchido
- [ ] Teste em dispositivo físico do fluxo completo com build `preview`
- [ ] `expo-local-authentication` / permissão de Face ID revisada em `app.json`
- [ ] Conta de teste para a revisão da Google (login + como acessar recursos premium)
- [ ] Rollback: EAS Update configurado ou plano de republicar o AAB anterior

---

## Documentos

- `CHANGELOG.md` — o que cada grupo de trabalho adicionou/alterou.
- `mobile/README.md` — notas da fase anterior (app local).
- `e2e/README.md` — como rodar os fluxos Maestro.
- `AGENTS.md` — convenções do repositório.
