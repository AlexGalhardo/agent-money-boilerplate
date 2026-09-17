Agora faça os fluxos:

1. Quando o usuário cria uma conta exclusivamente pelo google:
	- Na pagina /minha-conta, no card de mudar senha, crie uma senha forte com 32 characteres e deixe essa senha pré-colocada como valor padrão no campo 'Senha atual' e coloque um aviso em cima do campo 'Senha atual' em azul: 'Como você criou sua conta com o Google, essa é sua senha atual que foi gerada automaticamente'.

2. Eu ativei o fluxo de 2fa no meu deploy aqui (ENABLE_2FA="true"), e deu o seguinte erro, corrija:

[2026-09-17T22:22:25.082382635Z] [info] 🦊 Elysia Finanças API rodando em <http://localhost:8080>
[2026-09-17T22:22:25.082383165Z] [error]   help: Run `npx auth generate` to refresh the Prisma schema, then run `prisma migrate`.
[2026-09-17T22:22:25.082390095Z] [error] 2026-09-17T22:22:25.073Z ERROR [Better Auth]: Prisma schema mismatch
[2026-09-17T22:22:25.082393665Z] [error]
[2026-09-17T22:22:25.082396505Z] [error]   Missing columns
[2026-09-17T22:22:25.082398874Z] [error]     twoFactor.verified
[2026-09-17T22:22:25.082402004Z] [error]     twoFactor.failedVerificationCount
[2026-09-17T22:22:25.082405694Z] [error]     twoFactor.lockedUntil
[2026-09-17T22:22:25.082408314Z] [error]
[2026-09-17T22:22:45.084856512Z] [error]
[2026-09-17T22:22:45.084860442Z] [error]                                        ^
[2026-09-17T22:22:45.084863772Z] [error]       at /repo/node_modules/.bun/@better-auth+core@1.7.4+dd26a7c3b457a7f1/node_modules/@better-auth/core/dist/db/schema-check.mjs:70:35
[2026-09-17T22:22:45.084865491Z] [error] BetterAuthError: Prisma schema mismatch
[2026-09-17T22:22:45.084868931Z] [error]
[2026-09-17T22:22:45.084869901Z] [error]
[2026-09-17T22:22:45.084872751Z] [error] 65 |    verdict = void 0;
[2026-09-17T22:22:45.084874181Z] [error]   Missing columns
[2026-09-17T22:22:45.084876641Z] [error] 66 |   }
[2026-09-17T22:22:45.084878401Z] [error]     twoFactor.verified
[2026-09-17T22:22:45.084881631Z] [error] 67 |   if (clean) return;
[2026-09-17T22:22:45.084882511Z] [error]     twoFactor.failedVerificationCount
[2026-09-17T22:22:45.084885501Z] [error] 68 |   return verdict ??= Promise.resolve().then(find).then((findings) => {
[2026-09-17T22:22:45.084886091Z] [error]     twoFactor.lockedUntil
[2026-09-17T22:22:45.084889941Z] [error]
[2026-09-17T22:22:45.084897061Z] [error]   help: Run `npx auth generate` to refresh the Prisma schema, then run `prisma migrate`.
[2026-09-17T22:22:45.084900391Z] [error]  findings: [
[2026-09-17T22:22:45.084903851Z] [error]   [Object ...], [Object ...], [Object ...]
[2026-09-17T22:22:45.084908431Z] [error] ],
[2026-09-17T22:22:45.084912181Z] [error]    source: "prisma",
[2026-09-17T22:22:45.084917411Z] [error]      code: "SCHEMA_MISMATCH"
[2026-09-17T22:22:45.084921301Z] [error] 65 |    verdict = void 0;


2.1 Também certifique-se que o fluxo de 2fa está funcionando como esperado;
