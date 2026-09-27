# Setup local com Docker (Linux/macOS)

Builda e sobe os 3 serviços do monorepo (`backend`, `frontend`, `bot`) como
containers via Docker Compose. Não precisa instalar Bun, Postgres nem nada
além do Docker no host. Para rodar sem Docker, veja
[`setup-unix-using-pm2.md`](./setup-unix-using-pm2.md). No Windows, veja
[`setup-windows-using-docker.md`](./setup-windows-using-docker.md).

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose (`docker compose version`)

## Passo a passo

```bash
git clone git@github.com:AlexGalhardo/galhardo-money-bot.git
cd galhardo-money-bot
./setups/setup-docker.sh
```

O script pergunta qual banco usar:

```text
Qual banco de dados você quer usar?
  a) SQLite   (configuração rápida, padrão)
  b) Postgres
```

Para pular a pergunta (útil em automação), passe o banco como argumento:

```bash
./setups/setup-docker.sh sqlite     # equivalente a responder "a"
./setups/setup-docker.sh postgres   # equivalente a responder "b"
```

O script:

1. Cria `backend/.env` e `bot/.env` a partir dos respectivos `.env.example`,
   gerando `BETTER_AUTH_SECRET`/`ENCRYPTION_KEY` na primeira vez (arquivos
   já existentes são mantidos — só `DATABASE_PROVIDER`/`DATABASE_URL` são
   sincronizados com a escolha de banco a cada execução).
2. Builda e sobe os containers com `docker compose -f infra/docker-compose.sqlite.yml --project-directory . up -d --build`
   (SQLite) ou `docker compose -f infra/docker-compose.yml --project-directory . up -d --build` (Postgres, inclui um container
   `postgres` com healthcheck).
3. Espera a API responder em `/docs` (o entrypoint do container aplica
   migrations e gera o Prisma Client sozinho, ver `backend/docker-entrypoint.sh`)
   e então popula o banco (`bun run db:seed`) dentro do container.

## Rodando

- API: <http://localhost:4000> (docs OpenAPI em `/docs`)
- Frontend: <http://localhost:4001>

Usuários de teste: `admin@gmail.com` / `adminBR@123` (500 transações de
demonstração).

## Bot do Telegram (opcional)

O container `elysia-bot` sobe junto com os outros dois, mas fica reiniciando
até `TELEGRAM_BOT_TOKEN` e `BOT_PASSWORD_HASH_BASE64` serem preenchidos em
`bot/.env` (gere o hash com `cd bot && bun run hash-password "sua-senha"`).
Depois de editar:

```bash
docker compose -f infra/docker-compose.sqlite.yml --project-directory . restart bot   # SQLite
docker compose -f infra/docker-compose.yml --project-directory . restart bot                                # Postgres
```

Veja [`telegram-bot.md`](./telegram-bot.md) para o passo a passo completo — o
bot é multi-tenant, sem allowlist de chat fixo: cada chat se vincula à
própria conta enviando o ID dela.

## Prisma Studio

UI opcional para inspecionar/editar dados direto no banco, iniciada sob
demanda (não sobe junto com os outros serviços). Com Postgres, o banco já
está exposto em `localhost:5432`, então rodar do host funciona direto:

```bash
cd backend && bun run db:studio   # abre em http://localhost:5555 (Postgres)
```

Com SQLite, o banco vive num volume Docker nomeado (só visível de dentro do
container) — rode o Studio lá dentro em vez do host:

```bash
docker compose -f infra/docker-compose.sqlite.yml --project-directory . exec backend bunx prisma studio --port 5555 --hostname 0.0.0.0
# rode num terminal separado, depois abra http://localhost:5555
```

## Comandos úteis

Troque `-f infra/docker-compose.sqlite.yml` por `-f infra/docker-compose.yml`
se você escolheu Postgres:

```bash
docker compose -f infra/docker-compose.sqlite.yml --project-directory . logs -f      # logs em tempo real dos 3 serviços
docker compose -f infra/docker-compose.sqlite.yml --project-directory . logs -f backend  # ou só um serviço
docker compose -f infra/docker-compose.sqlite.yml --project-directory . ps
docker compose -f infra/docker-compose.sqlite.yml --project-directory . down     # para tudo, mantém o volume do banco
```

Também disponíveis como scripts do `package.json` da raiz:
`bun run docker:sqlite:up` / `:down` e `bun run docker:postgres:up` / `:down`.

## Importar extrato do Nubank

No dashboard, o botão **Importar** aceita o `.csv` exportado do extrato do
Nubank (colunas `Data,Valor,Identificador,Descrição`). Valores negativos
viram despesas, positivos viram receitas. A categoria de cada transação é
sugerida por palavras-chave na descrição (ex: "RDB" → Investimentos,
"SEGURADORA" → Seguro, "Pix" → Transferências); transações que não casam
nenhuma regra ficam marcadas para revisão manual antes de confirmar a
importação. Reimportar o mesmo arquivo não duplica transações já existentes
(mesma descrição, valor e dia).
