# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-rc] - 2026-09-30

### Added

- Electron desktop app (`desktop-electronjs/`), the fifth workspace, wrapping
  the web dashboard (ADR 0009).
- `bun run dev:all` starts the whole local stack (API, web, Expo on the LAN
  IP, desktop).
- `bun run qa`: QA/pentest pass over the API, web, desktop, bot and the
  Android emulator.
- `release.yml` builds every downloadable (Bun executables, Electron
  installers, Android APK, iOS simulator app) and publishes them on `v*` tags.
- `/api` renders the developer API reference with Scalar from an OpenAPI spec
  generated from the routes' Zod schemas.
- Mobile dark-only redesign on a token design system (`docs/design-system.md`)
  and a Playwright suite on the Expo web build; Maestro flows for native E2E.
- Prettier + markdownlint for Markdown, commitlint, root `bun run check`.
- `docs/` knowledge base (architecture, conventions, workflows, ADRs, deploy
  guides) and vendored agent skills in `.claude/skills/`.

### Changed

- Renamed to Agent Money Boilerplate (package scope and app name); infra
  files moved to `infra/`, root shell scripts to `setups/`.
- Backend errors go through one `AppError` hierarchy and a single error
  mapper; the app is built separately from `.listen()`.
- Dashboard and account pages split into focused components.
- Setup scripts consolidated into `setups/setup-docker.sh` and
  `setups/setup-pm2.sh`; setup and infra comments translated to English.
- CI: desktop package and QA jobs, bot binary build, `scripts/` typecheck.
- `mobile-build.yml` no longer queues an EAS `production` build on `main`;
  the release APK comes from `release.yml`.

### Removed

- **BREAKING**: linking a Telegram chat by pasting an account ID (bot) or a
  chat ID (web). Link through the bot login or the single-use web token.
- `xlsx` dependency (abandoned, known CVEs).
- Mobile light theme and toggle.

### Fixed

- Bot `/cancelar` was swallowed by an active conversation.
- Mobile amount field: editing with the caret mid-value scrambled the amount
  (the caret now stays at the end).
- Maestro flows fixed and run on an Android emulator for the first time.
- QA web group no longer flakes on a cold Vite dev server.
- Bot PIX checkout error, main menu reachable before login, Google login link.
- Nubank CSV import button styling and import modal width.
- Invalid `x-api-key` answered 500 instead of 401.
- Per-service Dockerfiles failed without `patches/`; Docker setup skipped
  seeding while waiting on a nonexistent endpoint.
- Deterministic seed data.

### Security

- OWASP Top 10 audit (`docs/security.md`): bot login lockout, encrypted
  auto-generated passwords, `GET /users/me` DTO, constant-time secret
  comparison, Zod-validated webhooks, input size limits, atomic link-token
  redeem, Telegram Markdown escaping, frontend security headers, http(s)-only
  images, CSV/XLSX formula-injection neutralization, no credentials in the
  seed or setup scripts.

## [0.1.0] - 2026-09-20

First versioned release. The 0.0.x entries below were never tagged; they are
recorded from the commit history.

### Added

- `CONTRIBUTING.md`, Conventional Commits and SemVer.

## 0.0.9 - 2026-09-20

### Fixed

- Vite proxy in E2E and admin logout.

### Security

- Leaked secrets removed from the repository.

## 0.0.8 - 2026-09-20

### Added

- Automated EAS Build for the mobile app; documented the deploy gate.

### Fixed

- E2E tests.

## 0.0.7 - 2026-09-20

### Changed

- Mobile UI rewritten with reacticx.

## 0.0.6 - 2026-09-19

### Added

- GitHub Actions CI/CD pipeline gating the Railway deploy.

## 0.0.5 - 2026-09-19

### Changed

- Mobile app rewritten on the shared backend.

## 0.0.4 - 2026-09-19

### Added

- Telegram bot authentication flow, translated auth errors, community skills.

## 0.0.3 - 2026-09-17

### Changed

- `api/` renamed to `backend/`; Railway deploy.

### Fixed

- Proxy and 2FA issues.

## 0.0.2 - 2026-09-15

### Added

- Branding, category icons, developer API keys, bot menu UX.

## 0.0.1 - 2026-09-15

### Added

- Initial application: auth, dashboard, transactions, PIX payments, Telegram
  bot.

[Unreleased]: https://github.com/AlexGalhardo/agent-money-boilerplate/compare/v1.0.0-rc...HEAD
[1.0.0-rc]: https://github.com/AlexGalhardo/agent-money-boilerplate/compare/v0.1.0...v1.0.0-rc
[0.1.0]: https://github.com/AlexGalhardo/agent-money-boilerplate/releases/tag/v0.1.0
