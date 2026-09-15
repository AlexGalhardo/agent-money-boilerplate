# Autenticação

Guia do fluxo de login, confirmação de e-mail e 2FA (Fase 4 da refatoração).
Base: better-auth `1.7.4` (`api/src/lib/auth.ts`), client em
`frontend/src/lib/auth-client.ts`.

## Confirmação de e-mail

Controlada pela env var `ENABLE_CONFIRM_EMAIL` (booleana, `api/src/config/env.ts`).

- **Cadastro via Google**: `emailVerified` nasce `true` automaticamente — o
  better-auth usa o próprio flag de e-mail verificado que o Google retorna no
  perfil OAuth (`userInfo.emailVerified`), sem código extra do nosso lado.
- **Cadastro via e-mail/senha, com a flag ligada**: `POST /api/auth/sign-up/email`
  cria o usuário, dispara o e-mail de confirmação (`VerifyEmail`,
  `api/src/emails/verify-email.tsx`, via Resend) e **não cria sessão** —
  a resposta vem com `token: null`. O frontend (`criar-conta.tsx`) detecta
  isso e mostra a tela "Confirme seu e-mail" em vez de navegar para o
  dashboard.
- **Tentativa de login sem confirmar**: `POST /api/auth/sign-in/email` responde
  403 com `error.code === "EMAIL_NOT_VERIFIED"`. O frontend (`entrar.tsx`)
  troca o formulário por uma tela dedicada com o botão "Reenviar link para
  confirmar e-mail", que chama `authClient.sendVerificationEmail({ email,
  callbackURL: "/entrar" })`.
- Com a flag desligada (padrão, `ENABLE_CONFIRM_EMAIL=false`), nada disso
  entra em jogo: cadastro e login funcionam de forma direta, como antes.

## Autenticação em duas etapas (2FA)

Controlada por `ENABLE_2FA`. Usa o plugin `twoFactor` do better-auth
(TOTP padrão Google Authenticator), com um método adicional por e-mail
(`otpOptions.sendOTP`, novo nesta fase — envia `TwoFactorOtpEmail`,
`api/src/emails/two-factor-otp.tsx`, via Resend).

- **Login por e-mail/senha com 2FA ativo**: `sign-in/email` responde com
  `{ twoFactorRedirect: true, twoFactorMethods: [...] }` em vez de criar
  sessão. O frontend abre um **modal** (`TwoFactorModal`,
  `frontend/src/components/two-factor-modal.tsx`) sobre a própria página de
  login — não navega para uma rota separada — pedindo o código de 6 dígitos
  do autenticador (`authClient.twoFactor.verifyTotp`), com o link alternativo
  "Enviar códigos por e-mail" que chama `authClient.twoFactor.sendOtp()` e
  troca para `authClient.twoFactor.verifyOtp`.
- **Login via Google + 2FA — limitação conhecida**: o hook interno do
  plugin `twoFactor` do better-auth só intercepta
  `/sign-in/email|username|phone-number`; ele **não** cobre o callback OAuth
  (`/callback/:id`). Ou seja, hoje um usuário com 2FA ativo que loga via
  Google **não** passa pelo desafio de 2FA — fica autenticado direto. Replicar
  esse comportamento para OAuth exigiria reimplementar, fora do plugin
  público, a lógica interna de invalidar a sessão recém-criada e guardar um
  cookie de desafio pendente (usa nomes de cookie e chamadas de
  `internalAdapter` que não fazem parte da API pública do better-auth) — não
  foi feito por ser frágil a upgrades da lib e por 2FA vir desligado por
  padrão (`ENABLE_2FA=false`). Documentado aqui em vez de implementado às
  pressas; se isso virar requisito real de segurança, vale abrir uma issue
  upstream no better-auth ou revisitar com mais tempo dedicado.
- A ativação/desativação do 2FA pelo próprio usuário (QR code, etc.) foi
  implementada na Fase 6 — ver `docs/minha-conta.md`. Esta fase (4) cobre só
  o desafio no momento do login.

## Cobertura de testes desta fase

`ENABLE_CONFIRM_EMAIL` e `ENABLE_2FA` estão como `false` em `.env` e
`.env.e2e` (ambiente de desenvolvimento pessoal). A suíte E2E compartilha um
único servidor de API por execução (`playwright.config.ts`), então não dá
para alternar essas flags por teste sem infraestrutura adicional (um segundo
`webServer`/build com as flags ligadas). Por isso os caminhos "positivos"
(e-mail pendente de confirmação, desafio de 2FA) não têm teste automatizado
ainda — só foram verificados por leitura de código/tipos contra o
comportamento real do better-auth (`node_modules/better-auth/dist/api/routes/
sign-up.mjs` e `sign-in.mjs`). Os caminhos "negativos" (login/cadastro
normais, com as flags desligadas) continuam cobertos pela suíte E2E
existente, que passou inteira após esta fase.
