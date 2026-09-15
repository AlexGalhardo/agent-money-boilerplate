# Minha conta (`/minha-conta`)

Guia da página de conta do usuário, implementada na Fase 6 da refatoração.

## Dados da conta

Formulário de nome (via `authClient.updateUser`) e e-mail (somente leitura,
`disabled`) — inalterado desde a Fase 4.

## Plano

Seção sempre visível. Busca o usuário completo via `GET /users/me`
(`api/src/modules/users/user.routes.ts`) — a sessão do better-auth não traz
`planStatus`/`freeTransactionCount`/`telegramChatId` por não serem
`additionalFields` registrados nela.

- **Plano ativo** (`hasActivePlan`, `api/src/lib/plan.ts` e seu espelho no
  frontend `frontend/src/lib/plan.ts`): mostra "PRO ativo até dd/mm/aaaa".
- **Sem plano ativo**: mostra "Gratuito" e o contador
  `freeTransactionCount`/`FREE_TRANSACTION_LIMIT` (10). Ao atingir o limite,
  uma mensagem avisa que os botões de adicionar/importar/exportar do
  dashboard ficam desabilitados (ver "Limite do plano gratuito" abaixo).
- Link "Assinar um plano" (para `/checkout`) só aparece com
  `ENABLE_ABACATEPAY=true` — ver `docs/pagamentos.md` para o fluxo completo
  de checkout PIX via AbacatePay (Fase 8).
- **Histórico de pagamentos** (`GET /payments/history`): lista todos os
  `PaymentLog` do usuário (sucesso/erro), mais recente primeiro. Vazio até o
  usuário ter alguma tentativa de pagamento.

## Limite do plano gratuito

Plano gratuito permite até `FREE_TRANSACTION_LIMIT` (10) transações no
total, contadas em `User.freeTransactionCount` — incrementado em
`transactionService.create` e em `transactionImportService.confirm` (a
importação aceita só o restante da cota, descartando o excedente do lote em
vez de rejeitar a importação inteira). Ao atingir o limite:

- A API responde `403 FreeLimitReachedError` para criar ou importar novas
  transações.
- O dashboard (`frontend/src/routes/dashboard/index.tsx`) busca o mesmo
  `GET /users/me` e desabilita os botões "Adicionar Despesa", "Adicionar
  Receita", "Importar", "Exportar .xlsx" e "Exportar .csv", com um aviso
  linkando para `/minha-conta`.
- Uma conta com plano ativo (`hasActivePlan`) nunca é bloqueada pelo
  contador, independente do valor de `freeTransactionCount`.
- O usuário de seed `admin@gmail.com` nasce com plano ativo "para sempre"
  (`planExpiresAt: 2099-12-31`) justamente para não esbarrar nesse limite ao
  rodar as 500 transações de demonstração/E2E.

## Autenticação em duas etapas (2FA)

Visível só com `ENABLE_2FA=true`. Componente
`frontend/src/components/two-factor-settings.tsx`, usando
`authClient.twoFactor.enable/verifyTotp/disable` do better-auth:

1. Usuário confirma a senha → `enable({ password, method: "totp" })` retorna
   `totpURI` + `backupCodes`; o QR code é gerado no cliente com a lib
   `qrcode` (`QRCode.toDataURL`), sem round-trip extra ao servidor.
2. Usuário escaneia no app autenticador e confirma um código de 6 dígitos
   (`verifyTotp`) para ativar de fato.
3. Com 2FA já ativo, a mesma seção mostra só o formulário de desativar
   (senha + `disable`).

O desafio de 2FA no **login** (não a ativação) é coberto por
`docs/autenticacao.md`.

## Bot do Telegram — vincular conta

Seção mostra o **ID da conta** (`me.id`, somente leitura) — é o que o bot
pede na primeira interação de um chat novo para se auto-vincular (ver
`docs/telegram-bot.md`, Fase 9). Também dá para vincular manualmente por
aqui: campo "Chat ID do Telegram" (`PUT /users/me` com `telegramChatId`,
`api/src/modules/users/user.schema.ts` valida que é numérico, opcionalmente
negativo, único por usuário no banco, e aceita string vazia para
desvincular — `userService.updateProfile` traduz `""` para `null`, já que
`""` não pode ser persistido diretamente por violar a constraint `@unique`).

## Exclusão de conta

Componente `frontend/src/components/delete-account-section.tsx`:

- **Plano ativo**: modal explica que é preciso cancelar/aguardar o
  vencimento antes de excluir — o botão de confirmar nem aparece
  (`ActivePlanError` no backend, `409`, é a mesma regra aplicada em
  `userService.requestDeletion`).
- **Plano gratuito**: modal com aviso dos 30 dias de carência e um botão com
  cooldown de 10 segundos ("[x] segundos para confirmar exclusão de
  conta"). Ao confirmar, `DELETE /users/me` faz um **soft-delete**
  (`User.deletionRequestedAt = now()`), não remove a conta na hora.
- Qualquer login dentro dos 30 dias cancela o pedido automaticamente
  (`databaseHooks.session.create.after` em `api/src/lib/auth.ts` zera
  `deletionRequestedAt`) — não existe uma tela separada de "cancelar
  exclusão", o próprio login já resolve.
- A exclusão definitiva roda pelo cronjob `GET /cron/delete-pending-accounts`
  (mesmo padrão de autenticação `Authorization: Bearer <CRON_SECRET>` do
  `check-expired-plans`), que apaga todo usuário com `deletionRequestedAt`
  mais antigo que 30 dias (`userService.purgePendingDeletions`).
