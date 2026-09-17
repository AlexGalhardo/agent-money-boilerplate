# Setup no Windows 11 (WSL2) com PM2, sem Docker

Roda os 3 workspaces (`backend`, `frontend`, `bot`) como processos PM2 em modo
watch, direto no WSL2 — sem containers para a aplicação. Para rodar via
Docker Desktop em vez disso, veja
[`setup-windows-using-docker.md`](./setup-windows-using-docker.md). No
Linux/macOS, veja [`setup-unix-using-pm2.md`](./setup-unix-using-pm2.md).

## Pré-requisitos

- [WSL2](https://learn.microsoft.com/windows/wsl/install) instalado
  (`wsl --install` num PowerShell administrador, se ainda não tiver)
- [Bun](https://bun.sh) >= 1.4 instalado **dentro** da distro WSL2 (não a
  versão Windows nativa — `curl -fsSL https://bun.sh/install | bash`)
- Escolhendo Postgres: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  aberto com integração WSL2 (só para o container do banco — a aplicação
  continua rodando fora de container) **ou** um Postgres já rodando em
  `localhost:5432` por conta própria.

Este script é um `.sh` — rode-o de dentro de um terminal **WSL2** (Ubuntu ou
distro equivalente) ou do **Git Bash**. Ele não roda no PowerShell nem no
`cmd.exe`.

## Passo a passo

```bash
# dentro do WSL2 (ou Git Bash)
git clone git@github.com:AlexGalhardo/elysia-tanstack-finances.git
cd elysia-tanstack-finances
./setup-windows-using-pm2.sh
```

O script pergunta qual banco usar:

```
Qual banco de dados você quer usar?
  a) SQLite   (configuração rápida, padrão)
  b) Postgres
```

Para pular a pergunta, passe o banco como argumento:
`./setup-windows-using-pm2.sh sqlite` ou `./setup-windows-using-pm2.sh postgres`.

O comportamento é idêntico ao `setup-unix-using-pm2.sh` (instala PM2 e
dependências, cria os `.env`, aplica migrations, popula o banco e sobe
`elysia-backend` + `elysia-frontend` com PM2), só com mensagens de erro
adaptadas para o Docker Desktop quando Postgres é escolhido.

`ecosystem.local.config.js` (raiz do projeto) é a config de PM2 usada aqui —
diferente de `ecosystem.config.js`, que é para deploy em VPS Linux com os
builds já compilados.

## Rodando

- API: http://localhost:4000 (docs OpenAPI em `/docs`)
- Frontend: http://localhost:4001

## Bot do Telegram (opcional)

Edite `bot/.env` com `TELEGRAM_BOT_TOKEN` e `BOT_PASSWORD_HASH_BASE64` (gere
com `cd bot && bun run hash-password "sua-senha"`), depois suba o processo:

```bash
pm2 start ecosystem.local.config.js --only elysia-bot
```

Veja [`telegram-bot.md`](./telegram-bot.md) para o passo a passo completo — o
bot é multi-tenant, sem allowlist de chat fixo: cada chat se vincula à
própria conta enviando o ID dela.

## Prisma Studio

UI opcional para inspecionar/editar dados direto no banco, iniciada sob
demanda (não sobe junto com os outros serviços):

```bash
cd backend && bun run db:studio   # abre em http://localhost:5555
```

## Problemas comuns no Windows

- **PM2 não encontrado após instalar**: confirme que está usando o Bun/PM2
  instalados dentro da distro WSL2 (`which bun`, `which pm2` devem apontar
  para caminhos como `/home/<user>/.bun/...`), não uma instalação Windows
  nativa — os dois ambientes têm PATHs separados.
- **Escolheu Postgres e nada sobe**: o Docker Desktop precisa estar aberto
  antes de rodar o script; sem ele, configure `DATABASE_URL` manualmente em
  `backend/.env` e `bot/.env` apontando para um Postgres já disponível.

## Comandos úteis

```bash
pm2 status
pm2 logs                     # logs em tempo real dos 3 serviços (backend, frontend, bot)
pm2 logs elysia-backend          # ou elysia-frontend / elysia-bot, para um serviço só
pm2 restart ecosystem.local.config.js
pm2 stop ecosystem.local.config.js
pm2 delete ecosystem.local.config.js
```

Também disponíveis como scripts do `package.json` da raiz: `bun run pm2:start`,
`pm2:start:bot`, `pm2:stop`, `pm2:restart`, `pm2:delete`.
