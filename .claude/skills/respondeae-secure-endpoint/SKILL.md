---
name: respondeae-secure-endpoint
description: >
  Checklist do RespondeAê para criar ou alterar uma Server Action (actions/), uma API route (app/api/) ou qualquer
  função que devolva dados ao browser. Use sempre que for escrever "use server", um route.ts, uma query que alimenta
  página pública, ou mexer em login/cadastro/senha/pagamento. Baseada nos achados reais da auditoria em
  docs/security.md.
---

# Endpoint seguro no RespondeAê

Toda Server Action é um endpoint HTTP público, chamável por qualquer um com quaisquer argumentos. Tudo que uma
action retorna, que um Server Component passa para um Client Component, e a sessão do NextAuth vão para o browser.
Os bugs mais graves do projeto vieram de esquecer essas duas frases.

## Antes de escrever

1. `"use server"` só em arquivos de `actions/`. Nunca em `lib/` (o teste `lib/repositories/public-surface.test.ts` quebra).
2. A regra de negócio vai num service em `lib/services/` (testável sem Next); a action/rota só autentica e chama.

## Checklist

- [ ] **Identidade da sessão**: `getSessionUser()` (`lib/session.ts`). Nenhum `userId`, `followerId`, `nickname` ou
      dono vindo do body/argumento identifica quem age. Exemplo real: `followUserAction(followingId, followerId)`
      deixava qualquer um fazer qualquer um seguir qualquer um.
- [ ] **Autorização por objeto**: a condição de dono vai no próprio `updateMany`/`where` (checagem e escrita numa
      instrução só, sem corrida). Ver `question-report.service.ts`, `withdraw.service.ts`.
- [ ] **Nada de linha inteira de `User` saindo**: `select` com `publicUserSelect`/`publicQuestionInclude`; perguntas
      públicas passam por `toPublicQuestion` (tira autor anônimo, campos internos, valor escondido); perfil por
      `toPublicProfile`. Filtrar privacidade **no servidor**, nunca "o client esconde".
- [ ] **Dinheiro calculado no servidor** (valor do webhook pago, `calculatePayout`), nunca do client.
- [ ] **Validação com Zod** no servidor, mesmo que o client já valide. Senhas usam as regras de `lib/schemas/signup.ts`.
- [ ] **Rate limit** em qualquer coisa abusável (login, cadastro, email, senha): `consumeRateLimit` + `RATE_LIMITS`
      (`lib/services/rate-limit.service.ts`), IP via `lib/request-ip.ts`. Limite que conta só falhas (login por
      email) usa `isRateLimited` + consumir na falha, para não permitir travar a conta da vítima.
- [ ] **Captcha falha fechado**: `isCaptchaValid` (`lib/captcha.ts`).
- [ ] **Erro para o usuário**: `publicErrorMessage(error, "texto genérico")` (`lib/errors.ts`), nunca `error.message`
      cru. O detalhe vai para `TelegramLog.error`.
- [ ] **Dados da conta não entram na sessão do NextAuth**: service em `lib/services/my-account.service.ts` + action em
      `actions/my-account-actions.ts`, consumidos por `useSessionBoundList`/`useMySocialGraph`.
- [ ] **Serviço externo novo** (script, API chamada do browser, iframe): adicione a origem em `lib/csp.ts` e rode
      `tests/e2e/csp.spec.ts` em modo produção, senão o CSP bloqueia em silêncio.
- [ ] **Segredo nunca em `NEXT_PUBLIC_*`** e nunca hardcoded (o GitHub Push Protection bloqueia o push).
- [ ] **Teste que prova o controle**: integração em `tests/integration/` (ex.: "outro usuário não consegue"), com
      Postgres descartável.

## Depois

Atualize `docs/security.md` se o endpoint criar uma superfície nova ou aceitar um risco.
