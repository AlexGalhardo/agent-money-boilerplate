# Setup no Windows 11 (WSL2 + Docker Desktop) com Docker

Builda e sobe os 3 serviços do monorepo (`backend`, `frontend`, `bot`) como
containers via Docker Compose, no Windows 11 com WSL2 + Docker Desktop. Para
rodar sem Docker (PM2 direto no host), veja
[`setup-windows-using-pm2.md`](./setup-windows-using-pm2.md). No Linux/macOS,
veja [`setup-unix-using-docker.md`](./setup-unix-using-docker.md).

## Pré-requisitos

- [WSL2](https://learn.microsoft.com/windows/wsl/install) instalado
  (`wsl --install` num PowerShell administrador, se ainda não tiver)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado
  e **aberto**, com a integração WSL2 habilitada em
  **Settings → Resources → WSL Integration**
- O repositório clonado **dentro do filesystem do WSL2** (ex: `~/code/...`),
  não em `/mnt/c/...` — builds e I/O de arquivo ficam muito mais rápidos
  assim (ver [docs.docker.com/desktop/wsl](https://docs.docker.com/desktop/wsl/))

Este script é um `.sh` — rode-o de dentro de um terminal **WSL2** (Ubuntu ou
distro equivalente) ou do **Git Bash**. Ele não roda no PowerShell nem no
`cmd.exe`.

## Passo a passo

```bash
# dentro do WSL2 (ou Git Bash)
git clone git@github.com:AlexGalhardo/galhardo-money-bot.git
cd galhardo-money-bot
./setups/setup-windows-using-docker.sh
```

O script pergunta qual banco usar:

```
Qual banco de dados você quer usar?
  a) SQLite   (configuração rápida, padrão)
  b) Postgres
```

Para pular a pergunta, passe o banco como argumento:
`./setups/setup-windows-using-docker.sh sqlite` ou `./setups/setup-windows-using-docker.sh postgres`.

O script confere se o Docker Desktop está rodando antes de continuar e
avisa (em vez de travar sem explicação) se não estiver. Fora isso, o
comportamento é idêntico ao `setups/setup-unix-using-docker.sh`:

1. Cria `backend/.env` e `bot/.env` a partir dos `.env.example` (gerando
   segredos na primeira vez).
2. Builda e sobe os containers (`docker compose -f infra/docker-compose.sqlite.yml --project-directory . up -d --build`
   para SQLite, ou `docker compose up -d --build` para Postgres).
3. Espera a API responder em `/docs` e popula o banco (`bun run db:seed`)
   dentro do container.

## Rodando

- API: http://localhost:4000 (docs OpenAPI em `/docs`)
- Frontend: http://localhost:4001

Usuários de teste: `admin@gmail.com` / `adminBR@123` (500 transações de
demonstração) e `aleexgvieira@gmail.com` / `galhardyn` (conta pessoal, sem
transações).

## Bot do Telegram (opcional)

Igual ao fluxo Docker no Linux/macOS — edite `bot/.env` com
`TELEGRAM_BOT_TOKEN` e `BOT_PASSWORD_HASH_BASE64` (gere com
`cd bot && bun run hash-password "sua-senha"`) e reinicie o container:

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

## Problemas comuns no Windows

- **"Docker Desktop parece não estar rodando"**: abra o Docker Desktop e
  espere o ícone da baleia na bandeja terminar de iniciar antes de rodar o
  script de novo.
- **Build muito lento / erros estranhos de I/O**: confira se o repositório
  está clonado dentro do WSL2 (`\\wsl$\...` ou `~/...` dentro da distro), não
  em `C:\Users\...` acessado via `/mnt/c/...`.
- **`bad interpreter` ao rodar o script**: geralmente sinal de que o arquivo
  foi salvo com `CRLF` em vez de `LF` — o `.gitattributes` do repositório já
  força `LF` para `*.sh`, então um `git clone` normal não deveria reproduzir
  isso; se ocorrer, rode `dos2unix setup-windows-using-docker.sh`.

## Comandos úteis

```bash
docker compose -f infra/docker-compose.sqlite.yml --project-directory . logs -f      # logs em tempo real dos 3 serviços
docker compose -f infra/docker-compose.sqlite.yml --project-directory . logs -f backend  # ou só um serviço
docker compose -f infra/docker-compose.sqlite.yml --project-directory . ps
docker compose -f infra/docker-compose.sqlite.yml --project-directory . down
```
