# Deploy em VPS Ubuntu 26.04 — com Docker

Guia para quem já tem Docker e Docker Compose instalados no servidor (ou não
se importa em instalá-los) e prefere não gerenciar Postgres/Caddy/PM2
manualmente. Para a variante sem Docker, veja
[`setup-vps-ubuntu-from-zero.md`](./setup-vps-ubuntu-from-zero.md).

## 1. Pré-requisitos no servidor

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# saia e entre de novo na sessão SSH para o grupo "docker" ter efeito
```

Aponte os registros DNS (tipo A) de `SEU_DOMINIO` e `api.SEU_DOMINIO` para o
IP do servidor — o Caddy do `docker-compose.prod.yml` emite o certificado TLS
automaticamente na primeira requisição.

## 2. Clonar e configurar

```bash
git clone git@github.com:AlexGalhardo/elysia-tanstack-finances.git
cd elysia-tanstack-finances
cp .env.example .env
cp backend/.env.example backend/.env
```

Edite `.env` (raiz — variáveis do docker-compose):

```env
DOMAIN=SEU_DOMINIO
POSTGRES_PASSWORD=SENHA_FORTE_AQUI
```

Edite `backend/.env` (a API roda com `NODE_ENV=production`; `DATABASE_URL` e
`DATABASE_PROVIDER` são sobrescritos pelo `docker-compose.prod.yml`, não
precisa repetir):

```env
NODE_ENV=production
APP_URL=https://api.SEU_DOMINIO
FRONTEND_URL=https://SEU_DOMINIO
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

Preencha também as credenciais de Google/Resend/AbacatePay/`CRON_SECRET`
conforme as feature flags que for ativar.

## 3. Subir

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Isso builda as imagens da API e do frontend, sobe Postgres + Caddy, aplica
as migrations e gera o Prisma Client automaticamente (ver
`backend/docker-entrypoint.sh`).

## 4. Popular o banco (opcional, apenas na primeira vez)

```bash
docker compose -f docker-compose.prod.yml exec backend bun run db:seed
```

## 5. Cronjob de verificação de plano expirado

Como a API já expõe `GET /cron/check-expired-plans`, um cronjob no host
chamando a rota é mais simples do que rodar o script dentro do container:

```bash
crontab -e
```

```cron
0 3 * * * curl -fsS -H "Authorization: Bearer SEU_CRON_SECRET" https://api.SEU_DOMINIO/cron/check-expired-plans >> /var/log/elysia-cron.log 2>&1
```

## Deploy de atualizações

```bash
cd elysia-tanstack-finances
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Comandos úteis

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml down   # para tudo (mantém os volumes)
```
