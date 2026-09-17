# Setup local com PM2 (Linux/macOS, sem Docker)

Roda os 3 workspaces (`backend`, `frontend`, `bot`) como processos PM2 em modo
watch (`bun run dev` de cada um), direto no host — sem containers. Para
rodar via Docker em vez disso, veja
[`setup-unix-using-docker.md`](./setup-unix-using-docker.md). No Windows,
veja [`setup-windows-using-pm2.md`](./setup-windows-using-pm2.md).

## Pré-requisitos

- [Bun](https://bun.sh) >= 1.4
- Escolhendo Postgres: [Docker](https://docs.docker.com/get-docker/) (só
  para o container do banco — a aplicação continua rodando fora de
  container) **ou** um Postgres já rodando em `localhost:5432` por conta
  própria.

## Passo a passo

```bash
git clone git@github.com:AlexGalhardo/elysia-tanstack-finances.git
cd elysia-tanstack-finances
./setup-unix-using-pm2.sh
```

O script pergunta qual banco usar:

```
Qual banco de dados você quer usar?
  a) SQLite   (configuração rápida, padrão)
  b) Postgres
```

Para pular a pergunta, passe o banco como argumento:
`./setup-unix-using-pm2.sh sqlite` ou `./setup-unix-using-pm2.sh postgres`.

O script:

1. Instala o PM2 globalmente (`bun install -g pm2`) se ainda não estiver
   disponível, e roda `bun install` no monorepo.
2. Cria `backend/.env` e `bot/.env` (gerando segredos na primeira vez), e, se
   Postgres foi escolhido, sobe só o container do banco
   (`docker compose up -d postgres`) quando o Docker está disponível.
3. Aplica migrations, gera o Prisma Client e popula o banco
   (`db:seed` — `admin@gmail.com` / `adminBR@123` + `aleexgvieira@gmail.com` / `galhardyn`).
4. Sobe `elysia-backend` e `elysia-frontend` com
   `pm2 start ecosystem.local.config.js --only elysia-backend,elysia-frontend`.
   `elysia-bot` só é iniciado automaticamente se `bot/.env` já tiver
   `TELEGRAM_BOT_TOKEN` preenchido (ver abaixo).

`ecosystem.local.config.js` (raiz do projeto) é a config de PM2 usada aqui —
diferente de `ecosystem.config.js`, que é para deploy em VPS com os builds
já compilados (ver [`setup-vps-ubuntu-from-zero.md`](./setup-vps-ubuntu-from-zero.md)).

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

## Importar extrato do Nubank

No dashboard, o botão **Importar** aceita o `.csv` exportado do extrato do
Nubank (colunas `Data,Valor,Identificador,Descrição`). Valores negativos
viram despesas, positivos viram receitas. A categoria de cada transação é
sugerida por palavras-chave na descrição (ex: "RDB" → Investimentos,
"SEGURADORA" → Seguro, "Pix" → Transferências); transações que não casam
nenhuma regra ficam marcadas para revisão manual antes de confirmar a
importação. Reimportar o mesmo arquivo não duplica transações já existentes
(mesma descrição, valor e dia).
