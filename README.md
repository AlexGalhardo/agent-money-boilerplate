<div align="center">
  <h1>Elysia Finanças</h1>
  <p>Controle de finanças pessoais — transações, categorias e relatórios visuais em um só lugar.</p>
</div>

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime / API | [Bun](https://bun.sh) + [ElysiaJS](https://elysiajs.com) |
| ORM | [Prisma](https://www.prisma.io) |
| Validação | [Zod](https://zod.dev) |
| Autenticação | [better-auth](https://www.better-auth.com) |
| Frontend | [TanStack Start](https://tanstack.com/start) |
| Estilo | [Tailwind CSS v4](https://tailwindcss.com) |
| E-mail transacional | [Resend](https://resend.com) + [react-email](https://react.email) |
| Pagamentos | [AbacatePay](https://www.abacatepay.com) (PIX) |
| Processo (VPS) | [PM2](https://pm2.keymetrics.io) |
| TLS (VPS) | [Caddy](https://caddyserver.com) |
| Bot do Telegram | [grammY](https://grammy.dev) |
| Testes | `bun:test` (unitário/integração/smoke) + [Playwright](https://playwright.dev) (E2E) |

Tipagem ponta-a-ponta entre API e frontend via [Eden](https://elysiajs.com/eden/overview.html).

## Documentação

- [Setup local com Docker (Linux/macOS)](./docs/setup-unix-using-docker.md)
- [Setup local com PM2, sem Docker (Linux/macOS)](./docs/setup-unix-using-pm2.md)
- [Setup local com Docker (Windows 11 + WSL2)](./docs/setup-windows-using-docker.md)
- [Setup local com PM2, sem Docker (Windows 11 + WSL2)](./docs/setup-windows-using-pm2.md)
- [Deploy em VPS Ubuntu — do zero, sem Docker](./docs/setup-vps-ubuntu-from-zero.md)
- [Deploy em VPS Ubuntu — com Docker](./docs/setup-vps-ubuntu.md)
- [Deploy em Vercel + Fly.io](./docs/setup-vercel-flyio.md)
- [Bot do Telegram](./docs/telegram-bot.md) — controle financeiro pessoal pelo Telegram

Changelog completo em [`CHANGELOG.md`](./CHANGELOG.md).

## Estrutura

```
/api/           → ElysiaJS (REST API, auth, pagamentos, cron)
/frontend/      → TanStack Start (SSR)
/bot/           → bot do Telegram (reusa Prisma/criptografia/regras da API)
/http-client/   → chamadas HTTP de referência (api.http)
/docs/          → guias de setup e deploy
```

## Créditos

Desenvolvido por [Alex Galhardo](https://github.com/AlexGalhardo).

## Licença

[MIT](http://opensource.org/licenses/MIT)
