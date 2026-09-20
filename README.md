<div align="center">

<img src="./docs/assets/logo.svg" alt="Money bag logo" width="120" />

# Agent Money Boilerplate

Personal finance tracking — transactions, categories and visual reports — built
as an end-to-end boilerplate for shipping AI-agent-assisted products: a REST
API, a web dashboard, a Telegram bot and a mobile app sharing one backend,
one auth system and one set of business rules.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://www.conventionalcommits.org/en/v1.0.0/)
[![SemVer](https://img.shields.io/badge/SemVer-2.0.0-blue.svg)](https://semver.org/)

</div>

## Table of contents

- [Introduction](#introduction)
- [Tech stack](#tech-stack)
- [Docs](#docs)
- [Setups](#setups)
- [How to contribute](#how-to-contribute)
- [Credits](#credits)

## Introduction

**Agent Money Boilerplate** is a Bun monorepo with four workspaces —
`backend`, `frontend`, `bot` and `mobile` — plus two clients that consume the
same API without being a workspace of their own (`bot` and `mobile` import
`@elysia-galhardo-finances/backend` directly):

```text
/backend/       → ElysiaJS (REST API, auth, payments, cron)
/frontend/      → TanStack Start (SSR web dashboard)
/bot/           → Telegram bot (reuses the API's Prisma/encryption/business rules)
/mobile/        → Expo + React Native (same API as frontend/bot, no backend of its own)
/http-client/   → reference HTTP calls (api.http)
/docs/          → setup and deploy guides
/setups/        → executable setup/deploy shell scripts
```

End-to-end typing between the API and the frontend is handled by
[Eden](https://elysiajs.com/eden/overview.html) — any new backend route is
already typed on the frontend and mobile app without generating anything.

The project is designed to be forked as a starting point: swap the domain
(transactions/categories) for whatever your product needs, and keep the
auth, payments, multi-client (web/bot/mobile) and agent-tooling scaffolding
(`.agents/skills/`, `CLAUDE.md`/`AGENTS.md`) that already works.

## Tech stack

| Layer                | Technology                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Runtime / API         | [Bun](https://bun.sh) + [ElysiaJS](https://elysiajs.com)                                                         |
| ORM                   | [Prisma](https://www.prisma.io) (dual schema — SQLite for local dev, PostgreSQL for production)                  |
| Validation            | [Zod](https://zod.dev)                                                                                           |
| Authentication        | [better-auth](https://www.better-auth.com) (cookie sessions, optional 2FA, Google OAuth)                         |
| Frontend              | [TanStack Start](https://tanstack.com/start) + [Tailwind CSS v4](https://tailwindcss.com)                        |
| Mobile                | [Expo](https://expo.dev) + React Native ([@better-auth/expo](https://www.better-auth.com/docs/integrations/expo)) |
| Telegram bot          | [grammY](https://grammy.dev)                                                                                      |
| Transactional e-mail  | [Resend](https://resend.com) + [react-email](https://react.email)                                                 |
| Payments              | [AbacatePay](https://www.abacatepay.com) (PIX)                                                                    |
| Testing               | `bun:test` (unit/integration) + [Playwright](https://playwright.dev) (E2E)                                       |
| Lint / format         | [Biome](https://biomejs.dev) (tabs, 120-column lines)                                                             |
| Process manager (VPS) | [PM2](https://pm2.keymetrics.io)                                                                                  |
| TLS (VPS)             | [Caddy](https://caddyserver.com)                                                                                  |
| CI/CD                 | GitHub Actions + Railway deploy gate                                                                              |

## Docs

Guides live in [`docs/`](./docs):

| Guide                                                                            | What it covers                                             |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [`setup-unix-using-docker.md`](./docs/setup-unix-using-docker.md)               | Local setup on Linux/macOS via Docker Compose               |
| [`setup-unix-using-pm2.md`](./docs/setup-unix-using-pm2.md)                     | Local setup on Linux/macOS via PM2, no Docker                |
| [`setup-windows-using-docker.md`](./docs/setup-windows-using-docker.md)         | Local setup on Windows 11 + WSL2 via Docker Desktop           |
| [`setup-windows-using-pm2.md`](./docs/setup-windows-using-pm2.md)               | Local setup on Windows 11 + WSL2 via PM2, no Docker           |
| [`deploy-railway.md`](./docs/deploy-railway.md)                                 | Production deploy to Railway                                 |
| [`setup-vps-ubuntu.md`](./docs/setup-vps-ubuntu.md)                             | Deploy to an Ubuntu VPS with Docker                           |
| [`setup-vps-ubuntu-from-zero.md`](./docs/setup-vps-ubuntu-from-zero.md)         | Deploy to a fresh Ubuntu VPS without Docker                   |
| [`setup-vercel-flyio.md`](./docs/setup-vercel-flyio.md)                         | Deploy the frontend to Vercel and the backend to Fly.io       |
| [`deploy-android.md`](./docs/deploy-android.md)                                 | Android app deploy — sideloadable APK and Google Play         |
| [`ci-cd-setup.md`](./docs/ci-cd-setup.md)                                       | GitHub Actions CI/CD and the Railway production deploy gate   |

## Setups

Executable bootstrap/deploy scripts live in [`setups/`](./setups) — each
asks interactively for SQLite or PostgreSQL, or accepts it as an argument to
skip the prompt (e.g. `./setups/setup-unix-using-docker.sh postgres`):

| Script                                                                     | What it does                                                        |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`setup-unix-using-docker.sh`](./setups/setup-unix-using-docker.sh)       | Bootstrap locally via Docker Compose (Linux/macOS)                    |
| [`setup-unix-using-pm2.sh`](./setups/setup-unix-using-pm2.sh)             | Bootstrap locally via PM2, no Docker (Linux/macOS)                    |
| [`setup-windows-using-docker.sh`](./setups/setup-windows-using-docker.sh) | Bootstrap locally via Docker Desktop (Windows 11 + WSL2)               |
| [`setup-windows-using-pm2.sh`](./setups/setup-windows-using-pm2.sh)       | Bootstrap locally via PM2, no Docker (Windows 11 + WSL2)               |
| [`deploy-android-apk.sh`](./setups/deploy-android-apk.sh)                 | Build a sideloadable Android APK (EAS cloud build or local)           |
| [`deploy-android-play-store.sh`](./setups/deploy-android-play-store.sh)   | Build (and optionally submit) the Android App Bundle for Google Play  |
| [`railway-entrypoint.sh`](./setups/railway-entrypoint.sh)                 | Container entrypoint used by the Railway deploy (see the root `Dockerfile`) |

## How to contribute

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full guide — branch
workflow, [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
(enforced by a git hook), [SemVer](https://semver.org/) policy, code
conventions and the pre-PR checklist. Short version:

1. Fork/branch from an up-to-date `main`.
2. Make your change, following the code conventions in [`CLAUDE.md`](./CLAUDE.md).
3. Run the checks the `pre-push` hook runs (typecheck, tests, build).
4. Open a Pull Request against `main` with a Conventional Commits title.

## Credits

Built by [Alex Galhardo](https://github.com/AlexGalhardo).

Licensed under the [MIT License](./LICENSE).
