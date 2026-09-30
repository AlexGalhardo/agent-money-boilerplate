<!-- markdownlint-disable-next-line MD041 -->
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
- [Quick start](#quick-start)
- [Docs](#docs)
- [Setups](#setups)
- [How to contribute](#how-to-contribute)
- [Credits](#credits)

## Introduction

**Agent Money Boilerplate** is a Bun monorepo with five workspaces —
`backend`, `frontend`, `bot`, `mobile` and `desktop-electronjs` — all
consuming the same API (`bot` and `mobile` import
`@agent-money-boilerplate/backend` directly; the desktop app wraps the web
dashboard):

```text
/backend/       → ElysiaJS (REST API, auth, payments, cron)
/frontend/      → TanStack Start (SSR web dashboard)
/bot/           → Telegram bot (reuses the API's Prisma/encryption/business rules)
/mobile/        → Expo + React Native (same API as frontend/bot, no backend of its own)
/desktop-electronjs/ → Electron shell around the web dashboard (Windows, Linux, macOS)
/scripts/       → dev.ts (whole local stack in one command), qa.ts (QA/pentest pass)
/http-client/   → reference HTTP calls (api.http)
/docs/          → setup and deploy guides
/setups/        → executable setup/deploy shell scripts
/infra/         → Dockerfile, docker-compose*.yml, Caddyfiles, PM2 ecosystem configs
```

End-to-end typing between the API and the frontend is handled by
[Eden](https://elysiajs.com/eden/overview.html) — any new backend route is
already typed on the frontend and mobile app without generating anything.

The project is designed to be forked as a starting point: swap the domain
(transactions/categories) for whatever your product needs, and keep the
auth, payments, multi-client (web/bot/mobile) and agent-tooling scaffolding
(`.agents/skills/`, `CLAUDE.md`/`AGENTS.md`) that already works.

## Tech stack

| Layer                 | Technology                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Runtime / API         | [Bun](https://bun.sh) + [ElysiaJS](https://elysiajs.com)                                                          |
| ORM                   | [Prisma](https://www.prisma.io) (dual schema — SQLite for local dev, PostgreSQL for production)                   |
| Validation            | [Zod](https://zod.dev)                                                                                            |
| Authentication        | [better-auth](https://www.better-auth.com) (cookie sessions, optional 2FA, Google OAuth)                          |
| Frontend              | [TanStack Start](https://tanstack.com/start) + [Tailwind CSS v4](https://tailwindcss.com)                         |
| Mobile                | [Expo](https://expo.dev) + React Native ([@better-auth/expo](https://www.better-auth.com/docs/integrations/expo)) |
| Desktop               | [Electron](https://www.electronjs.org) + [electron-builder](https://www.electron.build)                           |
| Telegram bot          | [grammY](https://grammy.dev)                                                                                      |
| Transactional e-mail  | [Resend](https://resend.com) + [react-email](https://react.email)                                                 |
| Payments              | [AbacatePay](https://www.abacatepay.com) (PIX)                                                                    |
| Testing               | `bun:test` (unit/integration) + [Playwright](https://playwright.dev) (E2E)                                        |
| Lint / format         | [Biome](https://biomejs.dev) (tabs, 120-column lines)                                                             |
| Process manager (VPS) | [PM2](https://pm2.keymetrics.io)                                                                                  |
| TLS (VPS)             | [Caddy](https://caddyserver.com)                                                                                  |
| CI/CD                 | GitHub Actions + Railway deploy gate                                                                              |

## Quick start

```bash
bun install
cp backend/.env.example backend/.env    # fill BETTER_AUTH_SECRET / ENCRYPTION_KEY (see the file)
bun run dev:all                         # API :4000, web :4001, Expo QR code, desktop window
bun run qa                              # QA/pentest pass on a throwaway seeded stack
```

`dev:all` points Expo at this computer's LAN IP, so Expo Go on a phone on
the same Wi-Fi reaches the local API. `qa` also drives the native app in
the Android emulator when an Android SDK is installed.

Downloads (Bun executables for the API and bot, the Electron installers
for Windows/Linux/macOS, the Android APK and the iOS simulator build) are
attached to every [GitHub Release](../../releases), built by
[`release.yml`](./.github/workflows/release.yml).

## Docs

Guides live in [`docs/`](./docs):

| Guide                                                           | What it covers                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| [`setup-unix-using-docker.md`](./docs/deploy/local-setup.md)    | Local setup on Linux/macOS via Docker Compose               |
| [`setup-unix-using-pm2.md`](./docs/deploy/local-setup.md)       | Local setup on Linux/macOS via PM2, no Docker               |
| [`setup-windows-using-docker.md`](./docs/deploy/local-setup.md) | Local setup on Windows 11 + WSL2 via Docker Desktop         |
| [`setup-windows-using-pm2.md`](./docs/deploy/local-setup.md)    | Local setup on Windows 11 + WSL2 via PM2, no Docker         |
| [`deploy-railway.md`](./docs/deploy/railway.md)                 | Production deploy to Railway                                |
| [`setup-vps-ubuntu.md`](./docs/deploy/vps.md)                   | Deploy to an Ubuntu VPS with Docker                         |
| [`setup-vps-ubuntu-from-zero.md`](./docs/deploy/vps.md)         | Deploy to a fresh Ubuntu VPS without Docker                 |
| [`setup-vercel-flyio.md`](./docs/deploy/vercel-flyio.md)        | Deploy the frontend to Vercel and the backend to Fly.io     |
| [`deploy-android.md`](./docs/deploy/android.md)                 | Android app deploy — sideloadable APK and Google Play       |
| [`ci-cd-setup.md`](./docs/deploy/ci-cd.md)                      | GitHub Actions CI/CD and the Railway production deploy gate |

## Setups

Executable bootstrap/deploy scripts live in [`setups/`](./setups) — each
asks interactively for SQLite or PostgreSQL, or accepts it as an argument to
skip the prompt (e.g. `./setups/setup-docker.sh postgres`):

| Script                                                                  | What it does                                                                |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`setup-docker.sh`](./setups/setup-docker.sh)                           | Bootstrap locally via Docker Compose (Linux, macOS, Windows 11 + WSL2)      |
| [`setup-pm2.sh`](./setups/setup-pm2.sh)                                 | Bootstrap locally via PM2, no Docker (Linux, macOS, Windows 11 + WSL2)      |
| [`deploy-android-apk.sh`](./setups/deploy-android-apk.sh)               | Build a sideloadable Android APK (EAS cloud build or local)                 |
| [`deploy-android-play-store.sh`](./setups/deploy-android-play-store.sh) | Build (and optionally submit) the Android App Bundle for Google Play        |
| [`railway-entrypoint.sh`](./setups/railway-entrypoint.sh)               | Container entrypoint used by the Railway deploy (see the root `Dockerfile`) |

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
