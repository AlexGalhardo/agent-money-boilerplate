Coloquei o EXPO_TOKEN usando o comando cli gh que você me pediu antes, agora:

Corrija:

1. O ci-cd de E2E no github actions está quebrando, segue referências para debug para você corrigir (se possivel rode o mesmo contexto localmente, verificando que tu passa, antes de subir novamente):

- <https://github.com/AlexGalhardo/galhardo-money-bot/actions/runs/35505950622/job/106065839629>

- [WebServer] $ bun --env-file=.env.e2e run src/server.ts

Running 21 tests using 1 worker

[WebServer] 10:47:53 AM [vite] http proxy error: /auth/sign-up/email
[WebServer] AggregateError [ECONNREFUSED]:
[WebServer] at internalConnectMultiple (node:net:1135:18)
[WebServer] at afterConnectMultiple (node:net:1716:7)
[WebServer] at TCPConnectWrap.callbackTrampoline (node:internal/async_hooks:130:17)
✘ 1 [chromium] › e2e/account.spec.ts:15:1 › a free account shows the Gratuito plan and usage counter (10.7s)
[WebServer] 10:48:02 AM [vite] http proxy error: /auth/sign-up/email
[WebServer] AggregateError [ECONNREFUSED]:
[WebServer] at internalConnectMultiple (node:net:1135:18)
[WebServer] at afterConnectMultiple (node:net:1716:7)
[WebServer] at TCPConnectWrap.callbackTrampoline (node:internal/async_hooks:130:17)
✘ 2 [chromium] › e2e/account.spec.ts:15:1 › a free account shows the Gratuito plan and usage counter (retry #1) (8.1s)
[WebServer] 10:48:10 AM [vite] http proxy error: /auth/sign-up/email
[WebServer] AggregateError [ECONNREFUSED]:
[WebServer] at internalConnectMultiple (node:net:1135:18)
[WebServer] at afterConnectMultiple (node:net:1716:7)
[WebServer] at TCPConnectWrap.callbackTrampoline (node:internal/async_hooks:130:17)
✘ 3 [chromium] › e2e/account.spec.ts:23:1 › saves the Telegram Chat ID and keeps it after reload (7.2s)
[WebServer] 10:48:18 AM [vite] http proxy error: /auth/sign-up/email
[WebServer] AggregateError [ECONNREFUSED]:
[WebServer] at internalConnectMultiple (node:net:1135:18)
[WebServer] at afterConnectMultiple (node:net:1716:7)
[WebServer] at TCPConnectWrap.callbackTrampoline (node:internal/async_hooks:130:17)
✘ 4 [chromium] › e2e/account.spec.ts:23:1 › saves the Telegram Chat ID and keeps it after reload (retry #1) (8.0s)
[WebServer] 10:48:27 AM [vite] http proxy error: /auth/sign-up/email
[WebServer] AggregateError [ECONNREFUSED]:
[WebServer] at internalConnectMultiple (node:net:1135:18)
[WebServer] at afterConnectMultiple (node:net:1716:7)
[WebServer] at TCPConnectWrap.callbackTrampoline (node:internal/async_hooks:130:17)

2. O ci-cd do EAS-BUILD está quebrando também, corrija:

Run eas build --platform android --profile production --non-interactive --no-wait
An Expo user account is required to proceed.
Either log in with eas login or set the EXPO_TOKEN environment variable if you're using EAS CLI on CI (Learn more: <https://docs.expo.dev/accounts/programmatic-access/>)
Error: build command failed.
Error: Process completed with exit code 1.

3. Mantenha o padrão para todas as skills desse projeto, ficarem na mesma pasta, sempre dentro de ./.agents/skills/
   a. Adicione a skill nesse projeto: <https://www.skills.sh/anthropics/skills/frontend-design>
   b. Adicione a skill nesse projeto: <https://www.skills.sh/mattpocock/skills/improve-codebase-architecture>
   c. Adicione a skill nesse projeto: <https://www.skills.sh/mattpocock/skills/tdd>
   d. Adicione a skill nesse projeto: <https://www.skills.sh/vercel-labs/agent-skills/vercel-react-best-practices>
   e. Adicione a skill nesse projeto: <https://www.skills.sh/vercel-labs/agent-skills/web-design-guidelines>

4. GRANDE TAREFA: Transformar esse projeto em OPEN SOURCE:

Contexto: Quero transformar esse projeto em padrão open source, para eu aprender mais (sou desenvolvedor profissional), aplicando todas as melhores práticas que outros projetos open source relevantes no github já seguem e evoluir esse projeto com o tempo:
a. MIT LICENSE
b. HOW TO CONTRIBUE guidelines
c. Siga estritamente o padrão <https://semver.org/>

- Faça uma grande refatoração nos commits antigos desse repositório (se necessário, junte alguns commits muito parecidos em 1 só) e siga estritamente o padrão: <https://www.conventionalcommits.org/en/v1.0.0/> -> Adicione no hooks ou outras configurações, para todo coomit seguir esse padrão de nome forçadamente também;
    - Também crie e adicione o padrão de releases no github, para ficar visível e poder baixar softwares em determinados milestones: Versão 0.1, 0.2, 0.2.2 etc (julgue você mesmo que versão esse software está, mas não pode ser o 1.0 ainda porque ainda não está estável)

d. Adicione e siga: <https://editorconfig.org/>
e. Crie uma skill exclusiva aqui do zero, chamado 'open-source-guidelines-pre-push.md' para os agentes sempre saberem o que deve ser feito antes de subir para dev/main;

Qualquer pergunta relevante que você tiver sobre, me pergunte no chat;
