# Deploy em VPS Ubuntu 26.04 — do zero, sem Docker

Guia para provisionar um servidor Ubuntu 26.04 LTS limpo, rodando a API e o
frontend como processos gerenciados pelo PM2, atrás do Caddy (TLS automático).
Não usa Docker — para a variante com Docker, veja
[`setup-vps-ubuntu.md`](./setup-vps-ubuntu.md).

## 1. Acesso e atualização do sistema

```bash
ssh root@SEU_IP
apt update && apt upgrade -y
adduser deploy
usermod -aG sudo deploy
su - deploy
```

## 2. Instalar Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

## 3. Instalar Postgres

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE USER elysia WITH PASSWORD 'SENHA_FORTE_AQUI';"
sudo -u postgres psql -c "CREATE DATABASE elysia_financas OWNER elysia;"
```

## 4. Instalar Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

## 5. Instalar PM2

```bash
bun install -g pm2
```

## 6. Clonar e configurar o projeto

```bash
git clone git@github.com:AlexGalhardo/elysia-tanstack-finances.git
cd elysia-tanstack-finances
bun install
cp api/.env.example api/.env
```

Edite `api/.env`:

```env
NODE_ENV=production
APP_URL=https://api.SEU_DOMINIO
FRONTEND_URL=https://SEU_DOMINIO
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://elysia:SENHA_FORTE_AQUI@localhost:5432/elysia_financas
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

Preencha também `GOOGLE_CLIENT_ID`/`SECRET`, `RESEND_API_KEY`/`RESEND_FROM_EMAIL`,
`ABACATEPAY_API_KEY`/`ABACATEPAY_WEBHOOK_SECRET` e `CRON_SECRET`
conforme os provedores que for usar (todos opcionais em desenvolvimento, mas
necessários para as feature flags correspondentes funcionarem em produção).

## 7. Build

```bash
(cd api && bun run db:deploy:postgres && bun run build)
(cd frontend && VITE_API_URL=https://api.SEU_DOMINIO bun run build)
```

O build da API gera o binário executável `api/server`; o do frontend gera
`frontend/dist/` (assets + SSR) — servido em produção por `frontend/server.ts`,
que soma o handler de SSR do TanStack Start com os arquivos estáticos de
`dist/client/assets` (o `dist/server/server.js` gerado pelo build sozinho não
serve `/assets/*`).

## 8. Subir com PM2

Na raiz do projeto (o `ecosystem.config.js` já referencia os dois builds):

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # siga a instrução impressa para o PM2 iniciar no boot
```

Comandos úteis: `pm2 status`, `pm2 logs elysia-api`, `pm2 restart elysia-api`.

## 9. Configurar o Caddy

```bash
sudo cp Caddyfile.vps /etc/caddy/Caddyfile
sudo sed -i "s/{\$DOMAIN}/SEU_DOMINIO/" /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Aponte os DNS `SEU_DOMINIO` e `api.SEU_DOMINIO` (registros A) para o IP do
servidor antes deste passo — o Caddy emite o certificado TLS automaticamente
na primeira requisição.

## 10. Cronjob de verificação de plano expirado

```bash
crontab -e
```

Adicione:

```cron
0 3 * * * cd /home/deploy/elysia-tanstack-finances/api && bun run cron:check-expired-plans >> /home/deploy/cron.log 2>&1
```

## Deploy de atualizações

```bash
cd elysia-tanstack-finances
git pull
bun install
(cd api && bun run db:deploy:postgres && bun run build)
(cd frontend && VITE_API_URL=https://api.SEU_DOMINIO bun run build)
pm2 restart ecosystem.config.js
```
