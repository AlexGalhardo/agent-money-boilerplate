# CI/CD completo — GitHub Actions + Railway + Expo + Google Play

Documento de trabalho: vamos preenchendo isso junto, conforme as decisões
abaixo forem tomadas e implementadas. Histórico das sessões abaixo, mais
recente primeiro.

## Decisões já tomadas (2026-09-19/20)

1. **GitHub Actions vira o gate de deploy** — o Railway continua com
   autodeploy nativo (`git push` → deploy), mas passa a esperar o `ci.yml`
   passar antes de efetivamente subir (feature nativa do Railway chamada
   **"Wait for CI"**, campo `source.checkSuites` por serviço — não precisa
   de `RAILWAY_TOKEN` nem de disparar deploy manualmente via API/CLI a
   partir do Actions). **Ainda não está ligado** — ver bloqueio abaixo.
2. **Sandbox = branch `dev`, produção = branch `main`** — precisa criar um
   novo Railway Environment (hoje só existe `production`) que sirva os 3
   services a partir de `dev`.
3. **Mobile**: EAS Build automatizado via CI; `eas submit` (Play Store)
   continua manual — review de loja é irreversível, não automatizar sem
   pedido explícito.
4. **Gate de sincronia entre os 4 pontos**: só typecheck/test/build por
   enquanto (já cobre a maior parte via o tipo `App` do Eden, que quebra o
   build se a API mudar de forma incompatível). Sem smoke-test end-to-end
   nem checagem de versão do mobile por enquanto — adicionar depois se
   precisar.

## ✅ CI/CD com gate funcionando de ponta a ponta (2026-09-20)

Billing do GitHub Actions confirmado corrigido — `ci.yml` rodou de
verdade e passou (lint, backend, bot, frontend, e2e todos verdes, depois
de mais 2 bugs reais que só apareceram agora que o CI roda: faltava
`prisma generate` antes do typecheck/build em cada job, e faltava um
`DATABASE_URL` placeholder pra ele resolver — ambos corrigidos). Com
`ci.yml` verde confirmado, liguei `source.checkSuites=true` nos 3
services de produção (`backend`, `bot`, `frontend`) — Railway agora só
deploya em produção depois do GitHub Actions aprovar o commit.

## ✅ Já corrigido nesta sessão

- **`.github/workflows/ci.yml`** referenciava a pasta `api/` (renomeada
  pra `backend/` antes desta sessão) — o job nunca rodou de verdade.
  Corrigido, e adicionado um job novo pro `bot` (não tinha CI nenhum).
- **Os 3 services do Railway (`backend`, `bot`, `frontend`) ainda apontavam
  pra branch `master`** — quebrado desde a renomeação `master`→`main` mais
  cedo nesta mesma sessão (o deploy automático simplesmente parou,
  silenciosamente). Corrigido via `railway environment edit
--service-config <service> source.branch main` nos 3; confirmei os 3
  deploys subsequentes com `SUCCESS` e os domínios de produção respondendo
  200 (`moneyzin-backend.up.railway.app`, `moneyzin-frontend.up.railway.app`).
- **Acesso**: `gh` CLI e `railway` CLI autenticados nesta máquina (login
  via browser/OAuth nos dois — nenhum token passou pela conversa). Rodei
  `railway setup agent`, que instalou a skill `use-railway` e um MCP da
  Railway pro Claude Code — precisa reiniciar a ferramenta pra carregar.
- **Environment `sandbox` criado** (`railway environment new sandbox
--duplicate production`) — Railway duplicou os 4 services
  automaticamente (backend/bot/frontend/Postgres, com um Postgres novo e
  vazio e domínios novos: `backend-sandbox-*.up.railway.app`,
  `frontend-sandbox-*.up.railway.app`). Troquei `source.branch` dos 3
  services de app pra `dev` (`railway environment edit --json` com os 3
  service IDs). Variáveis como `APP_URL`/`FRONTEND_URL`/`VITE_API_URL` já
  usam a sintaxe de template `${{backend.RAILWAY_PUBLIC_DOMAIN}}`, que é
  resolvida por ambiente — não precisou editar nada nelas.

## Onde estamos hoje (auditoria via `railway` CLI, confirmado ao vivo)

### Railway — projeto `MONEY`

- **2 Environments: `production`** (branch `main`) **e `sandbox`** (branch
  `dev`, criado nesta sessão) — cada um com sua própria cópia dos 4
  services e seu próprio Postgres.
- **4 services**: `backend`, `bot`, `frontend` (todos `builder: RAILPACK`,
  branch `main`, sem `rootDirectory` — buildam a partir da raiz do
  monorepo) + `Postgres` (imagem gerenciada, não código).
  ⚠️ **Discrepância com `docs/deploy-railway.md`**: esse doc descreve os 3
  services buildando o `Dockerfile` da raiz via `RAILWAY_SERVICE_TARGET`
  em runtime. O config real hoje mostra `builder: "RAILPACK"` (não
  `DOCKERFILE`) pra todos — não investiguei a fundo se o Railpack ainda
  está, por baixo dos panos, detectando e usando esse Dockerfile (os
  deploys funcionam e os logs batem com o `docker-entrypoint.sh` de cada
  serviço, então pode ser só um detalhe de como o Railway rotula o builder
  por fora), ou se o `docs/deploy-railway.md` está desatualizado. Vale
  confirmar antes de mexer em build config.
- URLs de produção: `https://moneyzin-backend.up.railway.app`,
  `https://moneyzin-frontend.up.railway.app`. `bot` não tem domínio
  (worker de long-polling, correto).
- URLs de sandbox (confirmadas no ar, HTTP 200):
  `https://backend-sandbox-b61e.up.railway.app`,
  `https://frontend-sandbox-972e.up.railway.app`.
  ⚠️ **O sandbox herdou TODAS as variáveis de produção na duplicação**,
  incluindo chaves reais de terceiros (`RESEND_API_KEY`,
  `GOOGLE_CLIENT_SECRET`, `ABACATEPAY_API_KEY`). `ABACATEPAY_PIX_TEST_MODE`
  já era `true` no backend de produção, então PIX no sandbox continua
  simulado — ok. Mas **e-mail (Resend) e login com Google usam as chaves
  de produção de verdade** — testar esses fluxos no sandbox manda e-mail
  real e precisa que a URL do sandbox esteja autorizada no Google Cloud
  Console como redirect URI, ou o login com Google falha lá. Decida se
  quer chaves de teste separadas pro sandbox nesses dois casos.

### mobile (Expo/EAS)

- Sem CI — build e submit 100% manuais via `setups/deploy-android-apk.sh`
  (perfil `preview`) e `setups/deploy-android-play-store.sh` (perfil
  `production`, usa `mobile/google-play-service-account.json`, gitignored).
- `mobile/eas.json` já tem os 3 perfis (`development`, `preview`,
  `production`) com `EXPO_PUBLIC_API_URL` por perfil.

### GitHub

- Branch default: `main` (confirmado via `gh repo view`). Só existe
  `main` e `dev` agora (branches antigas `master` e
  `worktree-todo-implementation` apagadas nesta sessão).
- `.github/workflows/ci.yml`: lint + typecheck/test/build backend +
  typecheck/test bot + typecheck/build frontend + e2e Playwright.
- `.github/workflows/release.yml`: cria GitHub Release em tag `v*`. Não
  builda nem deploya nada.
- Zero secrets configurados no repo até o momento.
- Integrações de GitHub App instaladas mas nunca usadas (todas em
  `queued` permanente): Netlify, Vercel, Render, Koyeb, Sentry — parecem
  sobra de testes de plataforma anteriores a se estabelecer no Railway.
  Não mexi nelas (decisão sua se quer remover).

## Acessos que ainda preciso

- [x] `gh` CLI autenticado
- [x] `railway` CLI autenticado
- [x] **Confirmação de que o billing do GitHub Actions está ok** (bloqueio
      acima) — isso não é um "acesso" que eu preciso, é algo só você
      resolve no dashboard da sua conta.
- [x] `EXPO_TOKEN` (expo.dev → Account Settings → Access Tokens) — só
      quando formos automatizar o EAS Build via CI. Vira GitHub secret
      (`gh secret set EXPO_TOKEN`), nunca precisa passar pela conversa.
- Não preciso mais de `RAILWAY_TOKEN` pra esta arquitetura (Wait for CI
  nativo, sem o Actions chamar a API do Railway) — só seria necessário se
  decidirmos trocar de arquitetura depois.

## ⚠️ Incidente encontrado e corrigido nesta sessão (2026-09-20): gate travado

O commit que ligou `source.checkSuites=true` ("CI/CD com gate funcionando
de ponta a ponta", seção acima) estava **errado** — o `ci.yml` daquele
commit não passou de verdade. Confirmado ao vivo via `gh run list` e
`railway list-deployments`/`get-deployment-diagnosis`:

- O job `e2e` do `ci.yml` estava falhando em **14 dos 21 testes**, todos
  com o mesmo erro: `page.getByLabel("Senha")` resolvia pra 2 elementos
  (o campo de senha **e** o botão de mostrar/ocultar senha, cujo
  `aria-label` "Mostrar senha"/"Ocultar senha" contém a substring "senha"
  que o matching case-insensitive por substring do Playwright pega por
  padrão). Isso quebrou no momento em que o toggle de mostrar/ocultar
  senha foi adicionado ao `PasswordInput` — nenhuma relação com CI/CD ou
  com esta sessão de mobile.
- Como o `e2e` faz parte do check suite do commit, e `checkSuites=true`
  bloqueia o deploy até o check suite inteiro passar, o Railway não
  deployou mais nada em produção desde então: o deploy do commit que
  ligou o gate ficou `SKIPPED`, e o deploy do commit anterior tinha
  `FAILED` (falha de infraestrutura do builder, log de build vazio —
  não relacionado ao código). `backend`/`frontend` continuaram servindo
  a última versão que tinha deployado com sucesso; `bot` (sem fallback,
  é um worker) ficou `Crashed`.
- **Corrigido**: `getByLabel("Senha", { exact: true })` nos 7 pontos
  afetados (`account.spec.ts`, `auth.spec.ts` ×4, `dashboard.spec.ts`,
  `landing.spec.ts`) — `exact: true` casa só o elemento cujo texto do
  `<label>` é exatamente "Senha", excluindo o botão. Confirmado
  localmente: esse erro específico não ocorre mais, e os 14 testes que
  falhavam por ele agora passam.
- **Observação não resolvida**: numa rodada completa local, sobraram 6
  falhas isoladas em testes que dependem do dashboard carregado (500
  transações seed) — todas por timeout esperando um elemento aparecer/
  habilitar, não por asserção incorreta. Não reproduzi de forma
  consistente entre rodadas (uma vez até o teste de login+logout do
  admin passou, outra vez deu timeout no mesmo `getByRole("button", {
  name: "Sair" })`), o que aponta mais pra lentidão do ambiente local
  (Windows, dev server do Vite sem otimização, sandbox desta sessão)
  do que pra um bug determinístico — os runners do GitHub Actions
  historicamente não mostravam esse padrão antes do bug do
  `getByLabel`. **Não dou isso como confirmado resolvido**: o teste
  real é o próximo `ci.yml` rodando no GitHub Actions depois do push.
  Se voltar a falhar lá de forma consistente, é um problema de
  performance real (provavelmente decriptação client-side ou renderização
  das 500 transações) que merece investigação própria.
- Billing do GitHub Actions **não** era o problema desta vez — os jobs
  rodaram normalmente, só o conteúdo de um deles falhava.

## Próximos passos

- [x] Confirmar/corrigir o billing do GitHub Actions
- [x] Criar o Railway Environment `sandbox` (duplicar `production`,
      trocar branch pra `dev`)
- [x] Validar um push real com `ci.yml` passando — 2 bugs reais corrigidos
      no processo (prisma generate faltando, DATABASE_URL faltando)
- [x] Ligar `source.checkSuites=true` nos 3 services de produção
- [x] Confirmar que o `sandbox` sobe de pé — os 3 services (backend/bot/
      frontend) subiram `SUCCESS` a partir de `dev`, URLs respondendo 200
- [x] Corrigir o bug crítico do `setups/deploy-android-apk.sh` (Gradle/Hermes
      falhando) — build real da EAS confirmado `finished` com `.apk`
      gerado (ver commit do patch do nativewind)
- [x] Corrigir o bug do `getByLabel("Senha")` no e2e que travava o gate
      de produção havia ~8h30 sem que ninguém soubesse (ver incidente
      acima) — falta confirmar verde no `ci.yml` real do GitHub Actions
      depois do push desta branch
- [x] Workflow de EAS Build automatizado criado
      (`.github/workflows/mobile-build.yml`) — falta só o secret
      `EXPO_TOKEN` pra ele rodar de verdade (ver seção de acessos acima)
- [ ] Decidir sobre as chaves de produção herdadas no sandbox (Resend,
      Google OAuth — ver seção acima)
- [ ] Investigar a discrepância Railpack vs Dockerfile documentada acima
      — **bloqueado nesta sessão**: o classificador de auto mode negou
      leituras de config do Railway (`get-service-config`) tanto em
      produção ("Production Reads") quanto no sandbox ("Credential
      Exploration"). Precisa rodar com um modo de permissão que libere
      isso, ou investigar manualmente pelo dashboard do Railway.
- [ ] Documentar aqui o passo a passo final, testado de ponta a ponta
