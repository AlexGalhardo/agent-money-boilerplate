# Subir o `op` com Docker Compose — Linux / macOS

Guia completo e do zero para rodar **a aplicação inteira** (API + PostgreSQL + app
web) dentro de containers, usando o `docker-compose.yml` que já existe no
repositório. Inclui instalação e configuração de todas as ferramentas.

> Versão para **Windows 11**: veja [`DEPLOY-DOCKER-WINDOWS.md`](./DEPLOY-DOCKER-WINDOWS.md).

---

## 1. O que vai subir

O `docker-compose.yml` na raiz define quatro serviços (dois deles opcionais):

| Serviço | Imagem / build | Porta no host | Função |
|---|---|---|---|
| `db` | `postgres:17-alpine` | `5432` (só em dev) | Banco de dados PostgreSQL 17 |
| `backend` | `backend/Dockerfile` (Bun + Elysia) | `3333` | API REST — auth, 2FA, assinaturas, sync, e-mails |
| `web` | `docker/mobile-web.Dockerfile` (Expo web + nginx) | `8081` | App (build web do Expo) servido por nginx |
| `metro` | perfil `native` | `8082` | Servidor Expo dev para testar o app **nativo** no Expo Go (opcional) |
| `migrate` | perfil `tools` | — | Roda as migrations manualmente (opcional; elas já rodam no boot do `backend`) |

Depois de subir:

| Recurso | URL | Observação |
|---|---|---|
| App web | <http://localhost:8081> | Build web do Expo, servido por nginx |
| API | <http://localhost:3333> | Também usada por webhooks e pelo app nativo |
| Health da API | <http://localhost:3333/health> | Deve responder `200` |
| PostgreSQL | `localhost:5432` | **Só exposto em dev** (via `docker-compose.override.yml`) |

Como funciona por dentro:

- O app web chama a API **na mesma origem**: o navegador bate em
  `http://localhost:8081/api/...` e o nginx faz proxy para o container `backend`
  (`/api/` → `http://backend:3333/`). **Não há CORS** para configurar.
- As **migrations do banco rodam sozinhas** toda vez que o `backend` sobe (são
  idempotentes).
- `docker compose up` (sem `-f`) **mescla automaticamente** o
  `docker-compose.override.yml`, que adiciona conveniências de desenvolvimento:
  hot-reload do backend, bind-mounts do código-fonte, porta do Postgres exposta e
  logs de dev. Para um modo "produção" que **ignora** esse override, use
  `docker compose -f docker-compose.yml up`.

---

## 2. Pré-requisitos de máquina

- **Linux** (x86-64 ou ARM64) com kernel recente, **ou macOS 12+** (Intel ou Apple Silicon).
- ~4 GB de RAM livres e ~5 GB de disco para as imagens.
- Acesso à internet para baixar imagens base (`postgres`, `oven/bun`, `nginx`).
- Portas `8081`, `3333` e `5432` livres no host (dá para trocar — veja o passo 4).

---

## 3. Instalar as ferramentas

Você precisa de **três** coisas: `git`, o **Docker Engine** (ou Docker Desktop) e
o plugin **Docker Compose v2** (`docker compose`, com espaço — não o antigo
`docker-compose`). `make` é opcional (só para os atalhos).

### 3.1. Git

<details open>
<summary><b>Debian / Ubuntu</b></summary>

```bash
sudo apt update
sudo apt install -y git
```
</details>

<details>
<summary><b>Fedora / RHEL / CentOS</b></summary>

```bash
sudo dnf install -y git
```
</details>

<details>
<summary><b>Arch / Manjaro</b></summary>

```bash
sudo pacman -S --needed git
```
</details>

<details>
<summary><b>macOS</b></summary>

```bash
xcode-select --install     # já traz o git
# ou, com Homebrew (https://brew.sh):
brew install git
```
</details>

Confira: `git --version`

### 3.2. Docker

#### Linux — Docker Engine (recomendado)

Use o **script de conveniência oficial** (funciona em Ubuntu, Debian, Fedora,
etc.):

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

Isso instala o Docker Engine **e** o plugin `docker compose` v2.

**Rodar o Docker sem `sudo`** (recomendado — evita ter que prefixar todo comando):

```bash
sudo usermod -aG docker "$USER"
newgrp docker            # aplica o grupo na sessão atual (ou faça logout/login)
```

**Habilitar o Docker no boot:**

```bash
sudo systemctl enable --now docker
```

> Alternativa em Ubuntu/Debian: instalar via repositório APT oficial seguindo
> <https://docs.docker.com/engine/install/ubuntu/>. O resultado é o mesmo.

#### macOS — Docker Desktop

1. Baixe o Docker Desktop para Mac em
   <https://www.docker.com/products/docker-desktop/> (escolha **Apple Silicon**
   ou **Intel** conforme o seu Mac).
2. Abra o `.dmg` e arraste **Docker** para *Applications*.
3. Abra o **Docker** pelo Launchpad e conceda as permissões que ele pedir.
4. Espere o ícone da baleia na barra de menu ficar estável ("Docker Desktop is
   running").

O Docker Desktop já inclui `docker compose` v2.

> Alternativa via Homebrew: `brew install --cask docker` e depois abra o app uma vez.

### 3.3. `make` (opcional — só para os atalhos do `Makefile`)

- Debian/Ubuntu: `sudo apt install -y make`
- Fedora: `sudo dnf install -y make`
- Arch: `sudo pacman -S --needed make`
- macOS: já vem com o Xcode Command Line Tools (passo 3.1).

---

## 4. Verificar a instalação

```bash
git --version
docker --version                 # Docker Engine 24+ / 25+
docker compose version           # >= v2.20  (obrigatório — o compose usa
                                 #   depends_on.condition + required:false)
docker run --rm hello-world      # baixa e roda um container de teste
```

Se `docker run hello-world` funcionar sem `sudo`, está tudo certo. Se pedir
permissão, refaça o `usermod -aG docker` + `newgrp docker` (ou reinicie a sessão).

No macOS, o `docker run hello-world` só funciona com o Docker Desktop **aberto**.

---

## 5. Obter o código

Se ainda não tem o repositório:

```bash
git clone <URL-do-seu-repositorio> op
cd op
```

Se já tem a pasta, apenas entre nela:

```bash
cd /caminho/para/op
```

Confirme que os arquivos-chave existem:

```bash
ls docker-compose.yml docker-compose.override.yml .env.example
ls backend/Dockerfile docker/mobile-web.Dockerfile docker/nginx.conf
```

---

## 6. Configurar o `.env`

O Docker Compose carrega **automaticamente** o arquivo `./.env` da raiz. Crie-o a
partir do template:

```bash
cp .env.example .env
```

Agora edite o `.env` (`nano .env`, `vim .env`, etc.).

### 6.1. Para um teste local rápido

O template **já funciona** para localhost — os valores padrão de banco são
consistentes entre si (`POSTGRES_PASSWORD` e `DATABASE_URL` combinam) e o e-mail
está em modo `dry-run` (cai no log, não envia). O mínimo recomendado é trocar a
senha do banco:

```dotenv
POSTGRES_PASSWORD=uma-senha-qualquer-local
DATABASE_URL=postgres://op:uma-senha-qualquer-local@db:5432/op
```

> ⚠️ **`DATABASE_URL` tem que repetir a mesma senha** que você pôs em
> `POSTGRES_PASSWORD`, e o host **tem que ser `db`** (o nome do serviço na rede do
> Compose), não `localhost`.

Nada mais é obrigatório: sem chaves de Stripe/AbacatePay/Resend/Google a API
sobe normalmente e todas as rotas que não são de pagamento funcionam.

### 6.2. Variáveis que importam

| Variável | Para quê | Trocar? |
|---|---|---|
| `WEB_PORT` (8081) | Porta do app no host | Só se 8081 estiver ocupada |
| `BACKEND_PORT` (3333) | Porta da API no host | Só se 3333 estiver ocupada |
| `DB_PORT` (5432) | Porta do Postgres no host (dev) | Só se 5432 estiver ocupada |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciais do container `db` | **Senha: sempre** |
| `DATABASE_URL` | String de conexão que o backend usa | Manter em sincronia com as acima |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Assinatura dos tokens | **Sempre em produção** (`openssl rand -base64 48`) |
| `EMAIL_DRY_RUN` (true) | `true` = e-mail vai pro log; `false` = envia de verdade | `false` só com `RESEND_API_KEY` real |
| `EXPO_PUBLIC_API_URL` (`http://localhost:8081/api`) | URL da API **embutida no build do app** | Só para deploy com domínios separados — veja §9 |
| `STRIPE_*`, `ABACATEPAY_*`, `GOOGLE_CLIENT_ID`, `RESEND_API_KEY` | Integrações externas | Só se for exercitar pagamentos/e-mail/login Google |

> As variáveis `EXPO_PUBLIC_*` são **inseridas no bundle no momento do build** da
> imagem `web`. Se mudar qualquer uma delas depois, é preciso **reconstruir** a
> imagem: `docker compose build web` (ou `make rebuild-web`).

### 6.3. Se for usar um banco gerenciado (RDS / Neon / Supabase / …)

Aponte `DATABASE_URL` no `.env` para o banco externo e **não suba o `db`**:

```bash
docker compose up -d --build backend web
```

---

## 7. Subir a stack (modo desenvolvimento)

Na raiz do projeto:

```bash
docker compose up -d --build
```

- `up` — cria e inicia os containers.
- `-d` — *detached* (roda em segundo plano).
- `--build` — (re)constrói as imagens `backend` e `web` a partir dos Dockerfiles.

A primeira execução leva **vários minutos**: baixa as imagens base, instala
dependências com Bun e faz o `expo export --platform web` do app. As próximas são
rápidas (cache de camadas).

Ordem que o Compose respeita sozinho: `db` sobe → fica *healthy* (`pg_isready`) →
`backend` sobe, roda as migrations e começa a servir → `web` sobe.

---

## 8. Verificar que subiu

```bash
docker compose ps
```

Você deve ver `db`, `backend` e `web` com status `running`/`healthy`.

Acompanhe os logs (Ctrl-C sai do log, **não** derruba os containers):

```bash
docker compose logs -f              # todos os serviços
docker compose logs -f backend      # só a API
```

Testes rápidos:

```bash
curl -fsS http://localhost:3333/health && echo   # API OK
curl -fsS -o /dev/null -w '%{http_code}\n' http://localhost:8081   # deve ser 200
```

Abra no navegador:

- App: <http://localhost:8081>
- API: <http://localhost:3333/health>

Fluxo de fumaça: cadastre um usuário no app → faça login → crie uma transação. Os
e-mails (confirmação etc.) aparecem em `docker compose logs -f backend` porque
`EMAIL_DRY_RUN=true`.

---

## 9. Modo produção (ignora o override de dev)

```bash
docker compose -f docker-compose.yml up -d --build
```

Diferenças em relação ao `docker compose up`:

- **Não** mescla o `docker-compose.override.yml` → sem bind-mounts, sem
  hot-reload, **Postgres não fica exposto** no host, `restart: unless-stopped` em
  todos os serviços.
- O `backend` roda no target `prod` do Dockerfile (imagem enxuta, usuário não-root).

Antes de subir em produção, preencha no `.env`:

- `POSTGRES_PASSWORD` forte e `DATABASE_URL` correspondente;
- `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` **novos** (`openssl rand -base64 48`);
- chaves **live** de Stripe e AbacatePay, se usar pagamentos;
- `RESEND_API_KEY` real + `EMAIL_DRY_RUN=false`, se for enviar e-mail;
- `APP_URL` e `WEB_APP_URL` com os domínios reais.

**Deploy com app e API em domínios diferentes:** o `EXPO_PUBLIC_API_URL` é
embutido no build. Aponte-o para `https://api.seudominio.com` e rode
`docker compose build web`. Para servir tudo no mesmo domínio, mantenha
`.../api` e coloque um TLS/ingress (Caddy, Traefik, nginx) na frente do serviço
`web`. Webhooks apontam direto para a API:
`https://api.seudominio.com/v1/webhooks/{stripe,abacatepay}`.

---

## 10. Comandos do dia a dia

### Via `make` (atalhos do `Makefile`)

| Comando | Ação |
|---|---|
| `make up` | Cria o `.env` se faltar, faz build e sobe tudo (dev) |
| `make prod` | Sobe em modo produção (ignora o override) |
| `make logs` | Segue os logs de todos os serviços |
| `make ps` | Status da stack |
| `make down` | Para e remove os containers (**mantém** o volume do banco) |
| `make stop` | Só para os containers |
| `make restart` | Reinicia todos os serviços |
| `make migrate` | Roda as migrations na stack em execução |
| `make psql` | Abre um shell `psql` no Postgres |
| `make rebuild-web` | Reconstrói **só** o app web (após mudar `EXPO_PUBLIC_*`) |
| `make native` | Sobe `db` + `backend` + servidor Expo (perfil `native`) |
| `make clean` | `down` + remove os volumes → **APAGA o banco** |
| `make nuke` | `clean` + remove as imagens construídas |
| `make help` | Lista todos os alvos |

### Via `docker compose` puro (equivalências)

```bash
docker compose up -d --build                       # = make up
docker compose -f docker-compose.yml up -d --build # = make prod
docker compose logs -f --tail=100                  # = make logs
docker compose ps                                  # = make ps
docker compose down                                # = make down
docker compose restart                             # = make restart
docker compose exec backend bun run db:migrate     # = make migrate
docker compose exec db psql -U op -d op            # = make psql
docker compose build web && docker compose up -d web   # = make rebuild-web
docker compose down -v                             # = make clean  (APAGA o banco)
```

Rodar as migrations num container efêmero (perfil `tools`), sem depender do
backend:

```bash
docker compose --profile tools run --rm migrate
```

---

## 11. Testar o app **nativo** no celular (perfil `native`, opcional)

O build web já cobre o uso no navegador. Para rodar o app **nativo** num aparelho
físico via **Expo Go** durante o desenvolvimento:

1. Descubra o IP da sua máquina na rede Wi-Fi:

   ```bash
   ip addr show        # Linux  (procure algo como 192.168.x.x)
   ipconfig getifaddr en0   # macOS
   ```

2. No `.env`, ajuste:

   ```dotenv
   LAN_HOST=192.168.0.42                       # o SEU IP
   EXPO_PUBLIC_API_URL_NATIVE=http://192.168.0.42:3333
   ```

3. Suba o perfil:

   ```bash
   make native
   # ou: docker compose --profile native up -d --build db backend metro
   ```

4. No celular (mesma Wi-Fi), abra o **Expo Go** e acesse
   `exp://192.168.0.42:8082`.

Parar: `make native-down` (ou `docker compose --profile native down`).

---

## 12. Atualizar / reconstruir

```bash
git pull                                  # traz novo código
docker compose up -d --build              # reconstrói o que mudou e recria containers
```

Depois de mudar **qualquer `EXPO_PUBLIC_*`** no `.env`:

```bash
docker compose build web
docker compose up -d web
```

Forçar rebuild total (ignora cache):

```bash
docker compose build --no-cache
docker compose up -d
```

---

## 13. Parar e limpar

| Objetivo | Comando |
|---|---|
| Parar, mantendo dados e containers | `docker compose stop` |
| Parar e remover containers, **mantendo** o banco | `docker compose down` |
| Remover tudo **incluindo o volume do banco** (apaga dados) | `docker compose down -v` |
| Remover também as imagens construídas | `docker compose down --rmi local -v` |
| Ver volumes | `docker volume ls \| grep op` |

O volume do banco chama-se `op_op_pgdata` (prefixo `op_` = `name: op` do compose).

---

## 14. Troubleshooting

| Sintoma | Causa provável / solução |
|---|---|
| `permission denied` ao rodar `docker` | Faltou `sudo usermod -aG docker $USER` + `newgrp docker` (ou relogar). |
| `Cannot connect to the Docker daemon` | Linux: `sudo systemctl start docker`. macOS: abra o Docker Desktop. |
| `docker compose` não existe, só `docker-compose` | Sua versão é antiga. Instale o plugin v2 (script get.docker.com) — o compose exige **v2.20+**. |
| `bind: address already in use` na porta 8081/3333/5432 | Outro processo usa a porta. Mude `WEB_PORT` / `BACKEND_PORT` / `DB_PORT` no `.env` e suba de novo. |
| App abre mas as chamadas de API falham (404/502) | O `backend` não está *healthy*. Veja `docker compose logs backend`. Rode `curl localhost:3333/health`. |
| Mudei `EXPO_PUBLIC_API_URL` e nada mudou no app | Essas variáveis são **baked no build**. Rode `docker compose build web && docker compose up -d web`. |
| `backend` reinicia em loop | Erro de conexão com o banco. Confira que `DATABASE_URL` usa host `db` e a **mesma senha** de `POSTGRES_PASSWORD`. Se mudou a senha depois do 1º boot, rode `docker compose down -v` para recriar o volume. |
| Migrations falham | `docker compose exec backend bun run db:migrate` para ver o erro completo. |
| Build do `web` falha no `expo export` | Veja o log do build. Rede instável ao baixar dependências é a causa comum — repita `docker compose build web`. |
| Disco cheio / builds antigos | `docker system prune -af` (remove imagens/redes/cache não usados — não mexe em volumes nomeados). |
| macOS build lento | Aumente CPU/RAM em Docker Desktop → *Settings* → *Resources*. |

Logs úteis:

```bash
docker compose logs backend --tail=200
docker compose logs web --tail=200
docker compose logs db --tail=50
docker compose exec backend sh          # shell dentro do container da API
```

---

## 15. Referência rápida

```bash
# do zero, uma vez
cp .env.example .env && nano .env        # troque POSTGRES_PASSWORD + DATABASE_URL

# subir (dev)
docker compose up -d --build

# ver
docker compose ps
docker compose logs -f
curl http://localhost:3333/health
open http://localhost:8081               # macOS  (xdg-open no Linux)

# subir (produção)
docker compose -f docker-compose.yml up -d --build

# parar
docker compose down                      # mantém o banco
docker compose down -v                   # apaga o banco
```
