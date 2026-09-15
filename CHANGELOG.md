# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added

- **Fase 10 da refatoração — infraestrutura**: os 4 scripts de bootstrap
  (`setup-*-using-{docker,pm2}.sh`) agora deixam explícito ao final da
  execução: a URL/comando do Prisma Studio (`cd api && bun run db:studio`,
  `http://localhost:5555` — nos setups Docker com SQLite, o banco vive num
  volume nomeado só visível de dentro do container, então o Studio também
  precisa rodar lá, via `docker compose ... exec api bunx prisma studio
  --port 5555 --hostname 0.0.0.0`, com a porta `5555` agora publicada em
  `docker-compose.sqlite.yml`), os 3 serviços ativos no PM2 (`elysia-api`,
  `elysia-frontend`, `elysia-bot`) com `pm2 logs` (sem argumento) como o
  comando para acompanhar os três em tempo real, e os 3 serviços ativos no
  Docker (`api`, `frontend`, `bot`) com `docker compose ... logs -f` (sem
  argumento) equivalente. `scripts/common.sh` ganhou o helper
  `print_prisma_studio_hint` (com variante para Docker+SQLite) e
  `print_bot_hint` foi atualizado para não citar mais
  `TELEGRAM_ALLOWED_CHAT_ID` (removido na Fase 9). Guias em `docs/setup-*.md`
  atualizados com as mesmas informações.

- **Fase 9 da refatoração — bot do Telegram migrado de Telegraf para grammY,
  agora multi-tenant**: removida a dependência `telegraf` e o modelo antigo
  de allowlist de chat único (`TELEGRAM_ALLOWED_CHAT_ID`) + usuário fixo
  (`PERSONAL_USER_EMAIL`). Cada chat agora se vincula à própria conta
  enviando o ID dela (exibido em `/minha-conta`, seção "Bot do Telegram",
  novo campo somente leitura), persistido no já existente
  `User.telegramChatId`. Toda operação passa a exigir plano ativo
  (`hasActivePlan`, reaproveitado de `api/src/lib/plan.ts`) — sem plano, o
  bot oferece assinar Mensal ou Anual ali mesmo no chat, gerando a cobrança
  PIX (`paymentService.createPixCheckout`), enviando QR code (foto) e
  código copia-e-cola, com botão de verificar pagamento e, em modo de
  teste (`ABACATEPAY_PIX_TEST_MODE`), simulação com a mesma janela de "10
  segundos" do checkout web. Comandos de barra substituídos por um menu de
  botões inline (`/start`/`/cancelar` continuam existindo, os demais viram
  botões). Novo botão "Relatório PDF" (`bot/src/lib/pdf-report.ts`, via
  `pdfkit`) gera um PDF dos últimos 7 ou 30 dias com totais e um gráfico de
  barras por categoria (pizza trocada por barras deliberadamente — mais
  simples e robusto de desenhar sem biblioteca de gráficos). Fallbacks
  (`otherwise`) em toda espera de mensagem/botão evitam o bot ficar em
  silêncio diante de um tipo de update inesperado, e um handler global de
  erro evita que uma exceção não tratada derrube o processo. Documentado em
  `docs/telegram-bot.md` (guia atual) — `docs/telegram-bot-plan.md` marcado
  como histórico/superado. Suíte do bot ampliada para 46/46 (lógica pura:
  senha/bloqueio, parse de valor, datas, formatação, mais um smoke test de
  wiring do `createBot()`); fluxos completos de conversation não têm teste
  automatizado (motor de replay do `@grammyjs/conversations` tornaria o
  harness desproporcional ao valor — mesma lógica já documentada para 2FA em
  `docs/autenticacao.md`), verificados manualmente.

### Fixed

- `paymentService.createPixCheckout` (Fase 8) retornava o `externalId` da
  AbacatePay como `id` da cobrança, mas `getCheckoutStatus`/`simulateCheckout`
  buscam pelo id **interno** do `PixCharge` — todo `GET /payments/pix/:id/status`
  e `POST /payments/pix/:id/simulate` feito com o `id` que a própria API
  retornava no `POST /payments/pix/checkout` sempre resultaria em
  `PixChargeNotFoundError`. Descoberto ao reutilizar `paymentService` no bot
  do Telegram (Fase 9). Corrigido para retornar o id interno; teste unitário
  de `createPixCheckout` ajustado para travar esse contrato.

- **Fase 8 da refatoração — migração de pagamentos Stripe → AbacatePay
  (PIX)**: fluxo Stripe removido por completo (pacote `stripe`, lib
  `src/lib/stripe.ts`, `stripeCustomerId` no `User`, `STRIPE_*` em
  `env.ts`). Novo cliente `api/src/lib/abacatepay.ts` (Checkout
  Transparente, API v2) e módulo de pagamentos reescrito:
  `POST /payments/pix/checkout` cria a cobrança PIX (nova tabela
  `PixCharge`, migration `migrate_stripe_to_abacatepay`),
  `GET /payments/pix/:id/status` faz polling com fallback de reconsulta
  direta à AbacatePay (necessário em dev local, já que o webhook exige
  endpoint HTTPS público), `POST /payments/pix/:id/simulate` (atrás de
  `ABACATEPAY_PIX_TEST_MODE`) simula pagamento em sandbox, e
  `POST /webhook/abacatepay` confirma automaticamente via os eventos
  `transparent.completed/refunded/disputed/lost` (verificado por
  `?webhookSecret=`, já que a documentação pública da AbacatePay não
  especifica um cabeçalho HMAC — ver limitação documentada em
  `docs/pagamentos.md`). `PaymentLog.stripeEventId` renomeado para
  `externalId` (genérico), continua registrando todo evento de pagamento
  (criação, sucesso, falha). Nova página `/checkout` com os dois planos
  (R$ 9,90/1 mês e R$ 99,90/12 meses) e o modal `PixCheckoutModal`
  (cooldown de expiração do PIX, QR code, copia-e-cola, cooldown de 60s
  antes de liberar o fechamento, e o botão "Pagar PIX Teste Mode" em modo
  de teste). `/minha-conta` trocou o antigo botão de checkout Stripe por
  um link para `/checkout`, atrás da nova flag `ENABLE_ABACATEPAY`.
  Documentado em `docs/pagamentos.md`. Suíte da API ampliada para 67/67
  (13 testes novos do `payment.service`, mais 3 de integração cobrindo o
  histórico de pagamentos e o comportamento com AbacatePay desligada) e
  suíte E2E (19/19, `/checkout` incluída no teste de rotas protegidas)
  seguem passando; builds de api e frontend verificados.

- **Fase 7 da refatoração — página `/contato`**: contador de caracteres ao
  vivo (`n/512`) na mensagem, campos de nome/e-mail pré-preenchidos e
  desabilitados para usuário logado (`useSession`), novo `<select>`
  obrigatório de assunto (Dúvidas e Sugestões / Problemas Técnicos e Bugs /
  Problemas com Pagamento / Outros assuntos). Título trocado de "Fale
  conosco" para "Entre em Contato", removido o texto de apoio "Tem dúvidas
  ou sugestões? Envie uma mensagem.". Documentado em `docs/contato.md`.
  Suíte E2E ampliada (19/19) e suíte da API (51/51) seguem passando.

- **Fase 6 da refatoração — página `/minha-conta` completa**: seção "Plano"
  sempre visível (antes só aparecia com `ENABLE_STRIPE=true`), buscando o
  usuário completo via `GET /users/me` (novo `frontend/src/lib/plan.ts`
  espelhando `hasActivePlan`/`FREE_TRANSACTION_LIMIT` do backend) — mostra
  "Gratuito" com o contador `freeTransactionCount`/10 quando não há plano
  ativo, ou "PRO ativo até dd/mm/aaaa" caso contrário, mais o histórico de
  pagamentos (`GET /payments/history`, já existente na API). Componente
  `TwoFactorSettings` (QR code via lib `qrcode`, ativar/verificar/desativar
  TOTP) finalmente ligado à página, atrás de `ENABLE_2FA`. Novo campo "Chat
  ID do Telegram" (`PUT /users/me`) para vincular transações feitas pelo bot
  à conta. Seção de exclusão trocada para usar o componente
  `DeleteAccountSection` já existente (modal com aviso de carência de 30
  dias e cooldown de 10 segundos antes de liberar a confirmação,
  bloqueando de vez quando há plano ativo). **Limite do plano gratuito** (10
  transações totais, já aplicado no backend numa alteração anterior)
  agora também desabilita no dashboard os botões "Adicionar Despesa",
  "Adicionar Receita", "Importar" e "Exportar .xlsx/.csv" quando atingido,
  com aviso linkando para `/minha-conta`. Documentado em
  `docs/minha-conta.md`. Suíte da API (51/51) segue passando.

- **Fase 5 da refatoração — dashboard reformulado**: nova coluna
  `Transaction.date` (migration `add_transaction_date`, ambos schemas
  Prisma) separando a data real da transação de `createdAt`; importação de
  CSV do Nubank ajustada para gravar a data do extrato em `date`. Header
  sem a palavra "Dashboard", 3 botões coloridos (Adicionar Despesa
  vermelho, Adicionar Receita verde, Importar roxo Nubank) + dropdown
  `UserMenu` (Minha Conta/Sair). Cards "Despesas/Receitas por categoria"
  dentro de `AccordionCard` (retráteis, `<details>` nativo), card fixo
  `BalanceCard` (saldo atual) sempre visível. Busca por nome com fuse.js
  no cliente (decisão do GRILL-ME da Fase 0) a partir de 3 caracteres,
  sobre o conjunto já filtrado por categoria/data no servidor — `perPage`
  máximo do endpoint `GET /transactions` subiu de 100 para 1000 para
  viabilizar isso. Filtros de categoria/data em uma segunda linha
  `justify-between`. Exportação para `.xlsx`/`.csv` (biblioteca `xlsx`),
  desabilitada sem transações. `TransactionForm` reescrito: cor
  verde/vermelho por tipo, tipo fixo ao criar via os novos botões, campo
  de valor com prefixo `+`/`−` e indicador `disabled` "R$", descrição
  forçada em maiúsculas (4–32 caracteres), novo campo de data com seletor
  de calendário. Documentado em `docs/dashboard.md`. Suíte E2E ampliada
  (13/13) e suíte da API (45/45) passando; builds de api e frontend
  verificados.

- **Fase 4 da refatoração — confirmação de e-mail e 2FA no login**:
  cadastro por e-mail/senha com `ENABLE_CONFIRM_EMAIL=true` agora mostra uma
  tela de "confirme seu e-mail" em vez de navegar para o dashboard (detecta
  `token: null` na resposta do `signUp.email`, que é como o better-auth sinaliza
  cadastro sem sessão pendente de verificação). Login sem e-mail confirmado
  mostra tela dedicada com "Reenviar link para confirmar e-mail"
  (`error.code === "EMAIL_NOT_VERIFIED"`). Novo modal `TwoFactorModal`
  (substitui a antiga página `/two-factor`) pedindo os 6 dígitos do
  autenticador quando `ENABLE_2FA=true`, com alternativa "Enviar códigos por
  e-mail" — novo `otpOptions.sendOTP` no plugin `twoFactor` do better-auth,
  com template `TwoFactorOtpEmail` via Resend. Cadastro via Google já nasce
  com e-mail confirmado (comportamento nativo do better-auth, sem código
  extra). Documentado em `docs/autenticacao.md`, incluindo a limitação
  conhecida de que 2FA não é aplicado a logins via Google (gap do próprio
  plugin `twoFactor`, que só intercepta sign-in por credencial). Suíte E2E
  completa (11/11) e suíte da API (45/45) seguem passando.

- **Fase 3 da refatoração — controle de acesso**: novo guard
  `redirectIfAuthenticated` (`frontend/src/lib/redirect-if-authenticated.ts`,
  espelhando o `requireAuth` existente) aplicado como `beforeLoad` em `/`,
  `/entrar`, `/criar-conta`, `/esqueci-senha` e `/resetar-senha` — usuário já
  autenticado que tentar acessar essas rotas é redirecionado para
  `/dashboard` via SSR (mesma checagem de sessão via cookie que o
  `requireAuth` já usava). Novo teste E2E cobrindo as 5 rotas — 11/11
  passando.

- Dependências `three`, `@react-three/fiber` e `@react-three/drei` (+
  `@types/three`) para o celular 3D animado da landing page (Fase 2).

### Changed

- **Fase 2 da refatoração — landing page (`/`) redesenhada**: tema
  exclusivamente escuro (via wrapper `.dark` isolado, independente do
  tema global salvo pelo usuário — o resto do app continua respeitando o
  toggle claro/escuro), tipografia `Geist` (a mesma do resend.com,
  carregada via Google Fonts) como fonte principal do app inteiro. Página
  ocupa 100% da viewport sem scroll (`h-dvh w-dvw overflow-hidden`).
  Navbar próprio da landing (só "Money" + botão "Entrar", sem reusar
  `SiteHeader`), hero em grid de 2 colunas ("Suas Finanças. No Telegram."
  à esquerda, celular 3D rotacionando à direita via novo componente
  `Phone3D`, renderizado só no cliente com `ClientOnly` para não quebrar
  o SSR), sem os antigos botões de CTA. Footer próprio (Contato, Política
  de Privacidade, Termos de Uso + `ThemeToggle`). As antigas seções de
  features e preço em USD foram removidas da landing — não cabiam no
  requisito de viewport único e a precificação será refeita em BRL/PIX na
  Fase 8. `TanStackDevtools` reposicionado de `bottom-right` para
  `bottom-left` porque seu gatilho flutuante passou a colidir com o novo
  `ThemeToggle` no rodapé (quebrava o clique em e2e e no dev local).
  Suíte E2E atualizada (heading/CTA da landing, teste de tema) — 10/10
  passando.

- **Fase 1 da refatoração — rotas do frontend renomeadas para português**:
  `/login`→`/entrar`, `/signup`→`/criar-conta`, `/forget-password`→`/esqueci-senha`,
  `/reset-password`→`/resetar-senha`, `/profile`→`/minha-conta`,
  `/policy`→`/politica-de-privacidade`, `/terms`→`/termos-de-uso`,
  `/contact`→`/contato` (`/dashboard` mantido). Atualizados todos os links
  internos (`site-header.tsx`, `site-footer.tsx`, `index.tsx`), o redirect de
  `requireAuth` para usuário não autenticado, o `redirectTo` do fluxo de
  recuperação de senha, e as URLs de `success_url`/`cancel_url` do checkout
  Stripe (`payment.service.ts`) que apontavam para `/profile`. Suíte E2E
  (Playwright) atualizada para as novas URLs — 10/10 testes passando. A rota
  `/confirm-email` → `/confirmar-email/{token}` fica para a Fase 4 (fluxo de
  confirmação de e-mail), já que a página ainda não existe hoje — criá-la
  isolada agora antecipava lógica de autenticação fora de escopo desta fase.

- `setup.sh` substituído por 4 scripts na raiz, um por combinação de SO e
  ferramenta: `setup-unix-using-docker.sh`, `setup-unix-using-pm2.sh`,
  `setup-windows-using-docker.sh` (Windows 11 + WSL2 + Docker Desktop) e
  `setup-windows-using-pm2.sh` (Windows 11 + WSL2 + PM2, sem Docker). Todos
  perguntam interativamente se o banco deve ser SQLite (padrão) ou Postgres,
  ou aceitam o banco como argumento para pular a pergunta. Lógica comum
  (geração de segredos, escrita dos `.env`, prompt de banco) extraída para
  `scripts/common.sh`, compartilhada pelos 4. `ecosystem.local.config.js`
  (novo) roda os 3 workspaces com PM2 em modo watch para desenvolvimento
  local — diferente do `ecosystem.config.js` existente, usado só no deploy
  em VPS com os builds já compilados. Docs `setup-local-sqlite.md`/
  `setup-local-postgres.md` substituídas por um guia por script em `docs/`.

## [0.0.1-alpha] - 2026-09-12

Primeira release da refatoração completa do projeto (API + frontend do zero).

### Fixed

- `prisma7.config.ts` não carregava `api/.env` sozinho (diferente do runtime do Bun) — `prisma generate`/`migrate` falhava com "Cannot resolve environment variable: DATABASE_URL" sempre que rodado sem `DATABASE_URL` já exportado no shell, o que quebrava `bun run build` (pego pelo hook de `pre-push` antes de chegar a produção) e teria quebrado os passos de banco de dados descritos em `docs/setup-local-*.md` e `setup.sh` para qualquer pessoa seguindo o guia do zero. Corrigido chamando `process.loadEnvFile(".env")` explicitamente no início do config (não sobrescreve variáveis já definidas no ambiente, então os scripts que passam `DATABASE_URL`/`DATABASE_PROVIDER` inline continuam funcionando como antes).
- Teste `encryption > throws when the ciphertext has been tampered with` era flaky (~1/256 chance de falso negativo, quando o último byte original já era `0x00`) — corrigido para inverter o byte (XOR 0xFF) em vez de zerá-lo, garantindo que a adulteração sempre mude o valor.
- Hooks do Husky (`pre-commit`/`pre-push`) não tinham `set -e`: se o primeiro comando de uma linha falhasse, o restante da linha (e, no `pre-push`, o `cd ..` de volta) não rodava, deixando o hook reportar sucesso indevido ou falhar com erro confuso ("cd: frontend: No such file or directory") em vez de bloquear o push pelo motivo real.
- Removidos ~100MB de binários compilados legados (`client`/`server`) que tinham ficado no commit inicial `Alpha 0.0.1` (existiam no repositório antes da limpeza, mas nunca deveriam ter sido versionados) — histórico reescrito para excluí-los antes do primeiro push.

### Fase 9 — Documentação e release

- Cinco guias em `docs/`: setup local com SQLite, setup local com Postgres, deploy em VPS Ubuntu do zero (PM2 + Caddy, sem Docker), deploy em VPS Ubuntu com Docker, deploy em Vercel (frontend) + Fly.io (API).
- `README.md` reescrito, enxuto: stack, links para os docs, estrutura do monorepo, créditos e licença. Arquivo `LICENSE` (MIT) adicionado.
- CI no GitHub Actions (`.github/workflows/ci.yml`): lint (Biome), typecheck + testes + build da API, typecheck + build do frontend, e suíte E2E completa com Playwright — em jobs separados.
- Workflow de release (`.github/workflows/release.yml`): cria uma GitHub Release automaticamente a cada tag `v*`, marcada como pre-release para versões `-alpha`/`-beta`.

### Fase 8 — Infraestrutura

- `api/Dockerfile` e `frontend/Dockerfile` multi-stage (usuário não-root, gera o Prisma Client e aplica migrations no start do container da API — a mesma imagem serve tanto SQLite quanto Postgres via `DATABASE_PROVIDER`).
- Três variantes de `docker-compose`: `docker-compose.sqlite.yml` (local, sem dependências externas), `docker-compose.yml` (local com Postgres) e `docker-compose.prod.yml` (VPS com Postgres + Caddy, TLS automático via `Caddyfile`, sem nginx/certbot).
- `ecosystem.config.js` (PM2) e `Caddyfile.vps` para deploy em VPS sem Docker, usando o binário compilado da API e o build do frontend.
- `setup.sh` para bootstrap local (SQLite por padrão, ou Postgres via docker-compose).
- Corrigido o script `build` da API para gerar o Prisma Client do Postgres antes de compilar o binário (antes usava o client gerado por último localmente, o que quebraria em produção se fosse SQLite).
- `.gitattributes` garantindo LF em scripts shell (evita "bad interpreter" em VPS/Linux a partir de um checkout Windows).
- Validado localmente: build e execução ponta-a-ponta da stack SQLite via Docker Compose real (API + frontend respondendo, migrations aplicadas, landing page renderizando); `docker-compose.yml` e `docker-compose.prod.yml` validados via `docker compose config`.

### Fase 7 — Qualidade

- Suíte de testes unitários (criptografia, regras de negócio do serviço de transações com repositório mockado via `bun:test` `mock.module`), integração (fluxo completo de auth + CRUD de transações + exclusão de conta contra um banco SQLite de teste dedicado, `api/.env.test`) e smoke (health check, docs, 404) — 27 testes na API.
- Suíte E2E com Playwright (`frontend/e2e`) cobrindo landing/institucionais, cadastro/login/logout, rotas protegidas e o fluxo completo do dashboard (gráficos, criar/editar/excluir transação, filtro de busca) e alternância de tema — 10 testes, rodando a API e o frontend em portas dedicadas (`api/.env.e2e`) com seed próprio.
- Hooks do Husky reescritos para a sintaxe atual (sem o shebang/source deprecados): `pre-commit` roda format + lint (Biome); `pre-push` roda typecheck, testes e build da API (incluindo o binário executável) e do frontend.

### Fase 6 — Pagamentos

- Checkout do plano anual ($49) via Stripe Checkout (modo pagamento único, não assinatura recorrente — o controle de vigência é feito por `planExpiresAt` + cronjob, não por renovação automática da Stripe).
- Webhook (`POST /payments/webhook`, com verificação de assinatura via corpo bruto da requisição) que ativa o plano em `checkout.session.completed` e registra `PaymentLog` para auditoria.
- Cronjob de verificação de plano expirado em duas variantes: `GET /cron/check-expired-plans` (autenticado via `Authorization: Bearer <CRON_SECRET>`, mesmo padrão do Vercel Cron — configurado em `api/vercel.json`) e script standalone `api/scripts/check-expired-plans.ts` para crontab de VPS/Docker.
- Seção de assinatura em `/profile` (mostrada apenas com `ENABLE_STRIPE=true`): inicia o checkout, exibe status/validade do plano e mensagens de sucesso/cancelamento via query string.

### Fase 5 — Dashboard

- CRUD completo de transações com modais de criar/editar/excluir, filtros por nome/categoria/intervalo de datas com paginação, e dois gráficos de pizza (despesas e receitas por categoria) usando `recharts` com paleta categórica validada para daltonismo (CVD-safe), reagindo ao tema claro/escuro.
- Rotas de transações da API migradas para validação declarativa via schema do Elysia (`{ query, body, params }` com os schemas Zod), eliminando `.parse()` manual e corrigindo erros de validação que antes retornavam 500 em vez de 400.
- `suppressHydrationWarning` no `<body>` do root da aplicação — necessário porque extensões do navegador (ex.: gerenciadores de senha) injetam atributos como `cz-shortcut-listen` antes da hidratação do React, o que gerava um erro de mismatch real (não é bug da aplicação).

### Fase 4 — Frontend base

- TanStack Start (SSR, sem o plugin beta `nitro` — build usa o servidor `srvx` embutido, saída padrão em `dist/server/server.js`), Tailwind v4 com tema laranja/preto e alternância claro/escuro sem flash (script inline + `localStorage`).
- Páginas institucionais: landing page, contato (validado com Zod), termos de uso, política de privacidade.
- Fluxo de autenticação no frontend: `/login`, `/signup` (com Google), `/forget-password`, `/reset-password`, `/two-factor` (TOTP) e `/profile` (atualizar nome, excluir conta), usando `better-auth/react`.
- Rotas protegidas com verificação de sessão tanto no cliente quanto no SSR (`getServerSession`, repassando o cookie da requisição para `GET /api/auth/get-session` da API, já que API e frontend rodam em servidores separados).
- Endpoint `GET /config` na API expondo as feature flags (`enableConfirmEmail`, `enable2FA`, `enableStripe`) para o frontend adaptar a UI.
- Tipagem ponta-a-ponta via Eden (`@elysia-galhardo-finances/api` como dependência do workspace do frontend).
- Módulo de usuários (`GET/PUT/DELETE /users/me`), com exclusão de conta bloqueada quando há plano ativo (`ActivePlanError`).
- Script de seed (`api/prisma/db:seed`): usuário `admin@gmail.com`/`adminBR@123` (verificado) + 500 transações distribuídas em 10 categorias e ambos os tipos (receita/despesa), com datas aleatórias no último ano.
- `http-client/api.http` atualizado com todas as rotas reais de auth, usuários e transações.

### Fase 3 — Autenticação

- better-auth configurado com adapter do Prisma, e-mail/senha, login social com Google (opcional via env) e plugin de 2FA (TOTP) atrás da flag `ENABLE_2FA`.
- Confirmação de e-mail (`requireEmailVerification`/`sendOnSignUp`) atrás da flag `ENABLE_CONFIRM_EMAIL`, e fluxo de redefinição de senha — ambos disparando e-mails via Resend com templates react-email (`src/emails/verify-email.tsx`, `src/emails/reset-password.tsx`).
- Macro `auth: true` do Elysia (`src/lib/auth.plugin.ts`) para proteger rotas usando a sessão do better-auth.

### Fase 2 — Backend core

- Schema do Prisma com models `User`, `Session`, `Account`, `Verification`, `TwoFactor`, `Transaction` e `PaymentLog`, mantido em dois arquivos (`schema.sqlite.prisma` / `schema.postgresql.prisma`) porque o Prisma não permite provider dinâmico no datasource; `prisma7.config.ts` seleciona schema/migrations via `DATABASE_PROVIDER`.
- Driver adapters do Prisma 7 (`@prisma/adapter-libsql` para SQLite — `better-sqlite3` não roda sob o Bun — e `@prisma/adapter-pg` para Postgres).
- Validação de ambiente com Zod (`src/config/env.ts`), falha rápida no boot se alguma variável obrigatória faltar ou for inválida.
- Criptografia AES-256-GCM (`src/lib/encryption.ts`) aplicada a `description` e `amount` das transações antes de persistir no banco.
- Módulo de transações em camadas (schema Zod → repository → service → routes), com CRUD completo, filtros (categoria, busca, intervalo de datas), paginação e endpoint de estatísticas por categoria para o gráfico de pizza do dashboard.
- Elysia + Eden (`export type App`) como base para tipagem ponta-a-ponta com o frontend; Swagger/OpenAPI servido em `/docs`.
- **Removido**: autenticação manual via JWT (`jsonwebtoken`), hashing próprio (`bcryptjs`) e validações manuais (`validateLogin.ts`, `validateSignup.ts`, `validateTransaction.ts`) — substituídos por better-auth e Zod.

### Fase 1 — Fundação

- Estrutura de monorepo (`api/`, `frontend/`, `http-client/`, `docs/`) com workspaces do Bun.
- Biome como linter/formatter único do projeto, substituindo ESLint + Prettier.
- Dependências atualizadas para as últimas versões estáveis de produção.
- **Removido**: histórico de commits anterior (resetado para este commit inicial), binários compilados, `bun.lockb`, dados de teste legados, feature de exportação para Excel — sem equivalente na nova especificação.
