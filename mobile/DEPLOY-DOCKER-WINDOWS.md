# Subir o `op` com Docker Compose — Windows 11

Guia completo e do zero para rodar **a aplicação inteira** (API + PostgreSQL + app
web) dentro de containers no Windows 11, usando o `docker-compose.yml` que já
existe no repositório. Inclui instalação e configuração de todas as ferramentas
(WSL 2, Docker Desktop, Git, PowerShell).

> Versão para **Linux / macOS**: veja [`DEPLOY-DOCKER-UNIX.md`](./DEPLOY-DOCKER-UNIX.md).

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

- **Windows 11** (qualquer edição — Home, Pro, Enterprise) 64-bit, atualizado.
- **Virtualização habilitada na BIOS/UEFI** (quase sempre já está). Confira no
  *Gerenciador de Tarefas* → aba *Desempenho* → *CPU* → "Virtualização: Ativado".
- ~8 GB de RAM (4 GB livres) e ~10 GB de disco.
- Conta com permissão de **administrador** para instalar.
- Acesso à internet.

Todo o build roda dentro do **WSL 2** (uma VM Linux leve). Você **não** precisa
instalar Bun, Node ou PostgreSQL no Windows — tudo acontece nos containers.

---

## 3. Instalar as ferramentas

Ordem: **1)** WSL 2 → **2)** Docker Desktop → **3)** Git → **4)** (config do PowerShell).

Abra o **PowerShell como Administrador** (menu Iniciar → digite "PowerShell" →
*Executar como administrador*) para os passos 3.1 e 3.3.

### 3.1. WSL 2 (Subsistema Windows para Linux)

O Docker Desktop usa o WSL 2 como backend. No Windows 11 basta um comando:

```powershell
wsl --install
```

Isso habilita os recursos necessários (*Virtual Machine Platform* + *WSL*), instala
o kernel do WSL 2 e uma distro Ubuntu por padrão.

**Reinicie o computador** quando ele pedir.

Depois do reboot, o Ubuntu abre sozinho e pede para criar um usuário/senha Linux
(pode ser qualquer um — você quase não vai usar diretamente). Feche a janela
quando terminar.

Confirme:

```powershell
wsl --status          # deve dizer "Versão padrão: 2"
wsl --update          # garante o kernel mais recente
```

> Se `wsl --install` disparar erro de recurso, habilite manualmente (PowerShell
> admin) e reinicie:
> ```powershell
> dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
> dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
> ```

### 3.2. Docker Desktop

1. Baixe o instalador em <https://www.docker.com/products/docker-desktop/> →
   **Download for Windows (AMD64)** (ou **ARM64** se seu PC for ARM).
2. Rode `Docker Desktop Installer.exe`. Na tela de opções, **deixe marcado**
   *"Use WSL 2 instead of Hyper-V"*.
3. Conclua e **reinicie** se for solicitado.
4. Abra o **Docker Desktop** pelo menu Iniciar. Aceite os termos. Não é
   obrigatório criar conta — pode fechar/pular o login.
5. Espere o ícone da baleia (bandeja do sistema, canto inferior direito) parar de
   animar e o painel mostrar **"Engine running"**.

**Configurações recomendadas** (Docker Desktop → ⚙️ *Settings*):

- *General* → **Start Docker Desktop when you sign in** (liga o Docker no login).
- *General* → confirme **Use the WSL 2 based engine** ligado.
- *Resources* → *WSL Integration* → deixe ligado para a distro padrão.
- *Resources* → *Advanced* → dê pelo menos **4 GB de RAM** e **2 CPUs** ao Docker.

O Docker Desktop já inclui o `docker compose` v2.

> **Alternativa via terminal** (PowerShell admin), se preferir:
> ```powershell
> winget install --id Docker.DockerDesktop -e
> ```
> Ainda assim, abra o Docker Desktop uma vez para concluir a configuração.

### 3.3. Git para Windows

PowerShell admin:

```powershell
winget install --id Git.Git -e
```

Feche e reabra o terminal depois de instalar (para o `git` entrar no `PATH`).

> O Git para Windows já vem com o **Git Bash**, um terminal onde você também pode
> usar os mesmos comandos do guia Unix, inclusive `make` se instalar (opcional:
> `winget install ezwinports.make`). Este guia foca no **PowerShell**, que é o
> caminho nativo no Windows.

### 3.4. Verificar tudo

Abra um **PowerShell normal** (não precisa ser admin) e rode:

```powershell
wsl --status
git --version
docker --version                 # Docker Engine 24+ / 25+
docker compose version           # >= v2.20  (obrigatório)
docker run --rm hello-world      # baixa e roda um container de teste
```

Se o `hello-world` imprimir a mensagem de boas-vindas, o Docker está funcionando.
Se der erro de conexão, **abra o Docker Desktop** e espere "Engine running".

---

## 4. Configurar o PowerShell para os scripts do projeto

O repositório traz um helper **`scripts\stack.ps1`** com os mesmos atalhos do
`Makefile`. Por padrão o Windows bloqueia scripts `.ps1`. Libere **para o seu
usuário** (não precisa de admin):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Responda `S` (Sim). Isso permite rodar scripts locais que você mesmo criou e
scripts remotos assinados — é a política recomendada pela Microsoft para
desenvolvimento.

> Sem alterar a policy, você ainda pode rodar o script pontualmente com:
> ```powershell
> powershell -ExecutionPolicy Bypass -File .\scripts\stack.ps1 up
> ```

---

## 5. Obter o código

### 5.1. Onde clonar

Clone **dentro do sistema de arquivos do Windows mesmo** (ex.:
`C:\Users\<voce>\dev\op` ou, como neste caso, `...\Desktop\op`). O
`docker-compose.yml` **não** faz bind-mount do código em produção; em dev o
override monta apenas `backend/` e `shared/`, e o Docker Desktop cuida da ponte
com o WSL 2 automaticamente. Não é necessário mover o projeto para dentro do WSL.

### 5.2. Clonar (se ainda não tiver a pasta)

```powershell
git clone <URL-do-seu-repositorio> op
cd op
```

Se já tem a pasta, apenas entre nela:

```powershell
cd C:\Users\<voce>\OneDrive\Desktop\op
```

### 5.3. Fim de linha (importante no Windows)

O repositório tem um `.gitattributes` que **força LF** nos arquivos executados
dentro dos containers (`*.sh`, `Dockerfile`, `*.yml`, `*.conf`, `Makefile`) e
**CRLF** nos `*.ps1`. Não configure `core.autocrlf` manualmente para `true` — o
`.gitattributes` já resolve. Se você editou algum `.yml`/`.sh` num editor que
salvou CRLF, restaure com:

```powershell
git checkout -- docker-compose.yml docker/nginx.conf
```

Confirme que os arquivos-chave existem:

```powershell
Get-ChildItem docker-compose.yml, docker-compose.override.yml, .env.example
Get-ChildItem backend\Dockerfile, docker\mobile-web.Dockerfile, docker\nginx.conf
```

---

## 6. Configurar o `.env`

O Docker Compose carrega **automaticamente** o arquivo `.\.env` da raiz. Crie-o a
partir do template:

```powershell
Copy-Item .env.example .env
notepad .env
```

### 6.1. Para um teste local rápido

O template **já funciona** para localhost — os valores padrão de banco são
consistentes entre si (`POSTGRES_PASSWORD` e `DATABASE_URL` combinam) e o e-mail
está em modo `dry-run` (cai no log, não envia). O mínimo recomendado é trocar a
senha do banco. No `.env`:

```dotenv
POSTGRES_PASSWORD=uma-senha-qualquer-local
DATABASE_URL=postgres://op:uma-senha-qualquer-local@db:5432/op
```

> ⚠️ **`DATABASE_URL` tem que repetir a mesma senha** que você pôs em
> `POSTGRES_PASSWORD`, e o host **tem que ser `db`** (o nome do serviço na rede do
> Compose), não `localhost`.

Salve o arquivo. **Cuidado com o Notepad:** ao salvar, confirme que o "Tipo" é
*Todos os arquivos* e o nome é exatamente `.env` (sem `.txt`). Verifique:

```powershell
Get-ChildItem .env        # o nome tem que aparecer como ".env"
```

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
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Assinatura dos tokens | **Sempre em produção** |
| `EMAIL_DRY_RUN` (true) | `true` = e-mail vai pro log; `false` = envia de verdade | `false` só com `RESEND_API_KEY` real |
| `EXPO_PUBLIC_API_URL` (`http://localhost:8081/api`) | URL da API **embutida no build do app** | Só para deploy com domínios separados — veja §9 |
| `STRIPE_*`, `ABACATEPAY_*`, `GOOGLE_CLIENT_ID`, `RESEND_API_KEY` | Integrações externas | Só se for exercitar pagamentos/e-mail/login Google |

Gerar segredos JWT fortes no PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))
```

> As variáveis `EXPO_PUBLIC_*` são **inseridas no bundle no momento do build** da
> imagem `web`. Se mudar qualquer uma delas depois, é preciso **reconstruir** a
> imagem: `docker compose build web` (ou `.\scripts\stack.ps1 rebuild-web`).

### 6.3. Se for usar um banco gerenciado (RDS / Neon / Supabase / …)

Aponte `DATABASE_URL` no `.env` para o banco externo e **não suba o `db`**:

```powershell
docker compose up -d --build backend web
```

---

## 7. Subir a stack (modo desenvolvimento)

Com o **Docker Desktop aberto** e "Engine running", na raiz do projeto:

```powershell
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

Atalho equivalente: `.\scripts\stack.ps1 up` (cria o `.env` do template se
faltar e sobe).

---

## 8. Verificar que subiu

```powershell
docker compose ps
```

Você deve ver `db`, `backend` e `web` com status `running`/`healthy`.

Acompanhe os logs (Ctrl-C sai do log, **não** derruba os containers):

```powershell
docker compose logs -f              # todos os serviços
docker compose logs -f backend      # só a API
```

Testes rápidos:

```powershell
Invoke-RestMethod http://localhost:3333/health
(Invoke-WebRequest http://localhost:8081 -UseBasicParsing).StatusCode   # 200
```

Abra no navegador:

- App: <http://localhost:8081>
- API: <http://localhost:3333/health>

Fluxo de fumaça: cadastre um usuário no app → faça login → crie uma transação. Os
e-mails aparecem em `docker compose logs -f backend` porque `EMAIL_DRY_RUN=true`.

---

## 9. Modo produção (ignora o override de dev)

```powershell
docker compose -f docker-compose.yml up -d --build
```

Ou o atalho: `.\scripts\stack.ps1 prod`.

Diferenças em relação ao `docker compose up`:

- **Não** mescla o `docker-compose.override.yml` → sem bind-mounts, sem
  hot-reload, **Postgres não fica exposto** no host, `restart: unless-stopped` em
  todos os serviços.
- O `backend` roda no target `prod` do Dockerfile (imagem enxuta, usuário não-root).

Antes de subir em produção, preencha no `.env`:

- `POSTGRES_PASSWORD` forte e `DATABASE_URL` correspondente;
- `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` **novos**;
- chaves **live** de Stripe e AbacatePay, se usar pagamentos;
- `RESEND_API_KEY` real + `EMAIL_DRY_RUN=false`, se for enviar e-mail;
- `APP_URL` e `WEB_APP_URL` com os domínios reais.

**Deploy com app e API em domínios diferentes:** o `EXPO_PUBLIC_API_URL` é
embutido no build. Aponte-o para `https://api.seudominio.com` e rode
`docker compose build web`. Para servir tudo no mesmo domínio, mantenha `.../api`
e coloque um TLS/ingress na frente do serviço `web`. Webhooks apontam direto para
a API: `https://api.seudominio.com/v1/webhooks/{stripe,abacatepay}`.

> Em produção real, normalmente você **não** roda Docker Desktop no Windows como
> host — sobe num servidor Linux. Use este modo para validar a imagem localmente.

---

## 10. Comandos do dia a dia

### Via `scripts\stack.ps1` (atalhos — equivalem ao `Makefile`)

| Comando | Ação |
|---|---|
| `.\scripts\stack.ps1 up` | Cria o `.env` se faltar, faz build e sobe tudo (dev) |
| `.\scripts\stack.ps1 prod` | Sobe em modo produção (ignora o override) |
| `.\scripts\stack.ps1 logs` | Segue os logs de todos os serviços |
| `.\scripts\stack.ps1 ps` | Status da stack |
| `.\scripts\stack.ps1 down` | Para e remove os containers (**mantém** o volume do banco) |
| `.\scripts\stack.ps1 stop` | Só para os containers |
| `.\scripts\stack.ps1 restart` | Reinicia todos os serviços |
| `.\scripts\stack.ps1 migrate` | Roda as migrations na stack em execução |
| `.\scripts\stack.ps1 psql` | Abre um shell `psql` no Postgres |
| `.\scripts\stack.ps1 rebuild-web` | Reconstrói **só** o app web (após mudar `EXPO_PUBLIC_*`) |
| `.\scripts\stack.ps1 native` | Sobe `db` + `backend` + servidor Expo (perfil `native`) |
| `.\scripts\stack.ps1 clean` | `down` + remove os volumes → **APAGA o banco** |
| `.\scripts\stack.ps1 nuke` | `clean` + remove as imagens construídas |
| `.\scripts\stack.ps1 help` | Lista os comandos |

### Via `docker compose` puro (equivalências)

```powershell
docker compose up -d --build                        # = stack.ps1 up
docker compose -f docker-compose.yml up -d --build  # = stack.ps1 prod
docker compose logs -f --tail=100                   # = stack.ps1 logs
docker compose ps                                   # = stack.ps1 ps
docker compose down                                 # = stack.ps1 down
docker compose restart                              # = stack.ps1 restart
docker compose exec backend bun run db:migrate      # = stack.ps1 migrate
docker compose exec db psql -U op -d op             # = stack.ps1 psql
docker compose build web ; docker compose up -d web # = stack.ps1 rebuild-web
docker compose down -v                              # = stack.ps1 clean  (APAGA o banco)
```

Rodar as migrations num container efêmero (perfil `tools`), sem depender do
backend:

```powershell
docker compose --profile tools run --rm migrate
```

---

## 11. Testar o app **nativo** no celular (perfil `native`, opcional)

O build web já cobre o uso no navegador. Para rodar o app **nativo** num aparelho
físico via **Expo Go** durante o desenvolvimento:

1. Descubra o IP da sua máquina na rede Wi-Fi:

   ```powershell
   ipconfig    # procure "Endereço IPv4" do adaptador Wi-Fi, ex.: 192.168.0.42
   ```

2. No `.env`, ajuste:

   ```dotenv
   LAN_HOST=192.168.0.42                        # o SEU IP
   EXPO_PUBLIC_API_URL_NATIVE=http://192.168.0.42:3333
   ```

3. Suba o perfil:

   ```powershell
   .\scripts\stack.ps1 native
   # ou: docker compose --profile native up -d --build db backend metro
   ```

4. **Libere as portas no Firewall do Windows** na primeira vez (o Windows vai
   perguntar — clique *Permitir acesso* para redes privadas), ou manualmente
   (PowerShell admin):

   ```powershell
   New-NetFirewallRule -DisplayName "op metro" -Direction Inbound -LocalPort 8082 -Protocol TCP -Action Allow
   New-NetFirewallRule -DisplayName "op api"   -Direction Inbound -LocalPort 3333 -Protocol TCP -Action Allow
   ```

5. No celular (mesma Wi-Fi), abra o **Expo Go** e acesse
   `exp://192.168.0.42:8082`.

Parar: `.\scripts\stack.ps1 native-down` (ou `docker compose --profile native down`).

---

## 12. Atualizar / reconstruir

```powershell
git pull                                   # traz novo código
docker compose up -d --build               # reconstrói o que mudou e recria containers
```

Depois de mudar **qualquer `EXPO_PUBLIC_*`** no `.env`:

```powershell
docker compose build web
docker compose up -d web
```

Forçar rebuild total (ignora cache):

```powershell
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
| Ver volumes | `docker volume ls` |

O volume do banco chama-se `op_op_pgdata` (prefixo `op_` = `name: op` do compose).
Você também vê e apaga containers/imagens/volumes pelo painel do **Docker Desktop**.

---

## 14. Troubleshooting

| Sintoma | Causa provável / solução |
|---|---|
| `error during connect` / `Cannot connect to the Docker daemon` | O **Docker Desktop não está aberto** ou ainda subindo. Abra-o e espere "Engine running". |
| `docker` não é reconhecido no PowerShell | Feche e reabra o terminal após instalar o Docker Desktop; confirme que ele finalizou a 1ª configuração. |
| `wsl --install` falha ou Docker reclama do WSL | `wsl --update`, reinicie. Confira virtualização ligada na UEFI e o recurso *Virtual Machine Platform* ativo. |
| `.\scripts\stack.ps1` não executa ("execução de scripts foi desabilitada") | Rode `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (§4) ou use `powershell -ExecutionPolicy Bypass -File .\scripts\stack.ps1 up`. |
| Arquivo virou `.env.txt` | O Notepad adicionou extensão. `Rename-Item .env.txt .env`. Ative "extensões de nome de arquivo" no Explorer para enxergar. |
| `ports are not available` / `address already in use` (8081/3333/5432) | Outro processo usa a porta. Descubra com `Get-NetTCPConnection -LocalPort 8081` e mude `WEB_PORT`/`BACKEND_PORT`/`DB_PORT` no `.env`. |
| App abre mas as chamadas de API falham (404/502) | O `backend` não está *healthy*. `docker compose logs backend`; `Invoke-RestMethod http://localhost:3333/health`. |
| Mudei `EXPO_PUBLIC_API_URL` e nada mudou no app | Essas variáveis são **baked no build**. `docker compose build web ; docker compose up -d web`. |
| `backend` reinicia em loop | Erro de conexão com o banco. `DATABASE_URL` deve usar host `db` e a **mesma senha** de `POSTGRES_PASSWORD`. Se mudou a senha após o 1º boot, `docker compose down -v` para recriar o volume. |
| Erro de fim de linha em `.sh`/`.yml` dentro do container (`\r`) | Um editor salvou CRLF. `git checkout -- <arquivo>` restaura (o `.gitattributes` mantém LF). |
| Build lento / trava | Docker Desktop → *Settings* → *Resources* → aumente RAM (≥4 GB) e CPUs. |
| Disco cheio / builds antigos | `docker system prune -af` (não mexe em volumes nomeados). No Docker Desktop: *Settings* → *Resources* → *Advanced* → limpar. |
| `metro`/Expo Go não conecta pelo celular | Firewall do Windows bloqueando (§11 passo 4) e/ou `LAN_HOST` errado. Celular e PC precisam estar na **mesma** rede Wi-Fi. |

Logs úteis:

```powershell
docker compose logs backend --tail=200
docker compose logs web --tail=200
docker compose logs db --tail=50
docker compose exec backend sh          # shell dentro do container da API
```

---

## 15. Referência rápida

```powershell
# do zero, uma vez
Copy-Item .env.example .env ; notepad .env   # troque POSTGRES_PASSWORD + DATABASE_URL

# subir (dev) — Docker Desktop precisa estar aberto
docker compose up -d --build

# ver
docker compose ps
docker compose logs -f
Invoke-RestMethod http://localhost:3333/health
Start-Process http://localhost:8081

# subir (produção)
docker compose -f docker-compose.yml up -d --build

# parar
docker compose down        # mantém o banco
docker compose down -v     # apaga o banco
```
