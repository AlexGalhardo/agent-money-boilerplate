# Architecture

## What this is

**Agent Money Boilerplate** — a forkable personal finance boilerplate
(transactions, categories, visual reports) built to demonstrate a
multi-client product sharing one backend: a REST API, a web dashboard, a
Telegram bot and a mobile app, all driven by the same auth, business
rules and database.

A Bun monorepo with four workspaces (`backend`, `frontend`, `bot`,
`mobile`) plus two clients that consume the API without being a workspace
of their own (`bot` and `mobile` import `@agent-money-boilerplate/backend`
directly):

```text
/backend/       → ElysiaJS (REST API, auth, payments, cron)
/frontend/      → TanStack Start (SSR web dashboard)
/bot/           → Telegram bot (reuses the API's Prisma/encryption/business rules)
/mobile/        → Expo + React Native (same API as frontend/bot, no backend of its own)
/http-client/   → reference HTTP calls (api.http)
/docs/          → this directory — setup, deploy and architecture guides
/setups/        → executable setup/deploy shell scripts
/infra/         → Dockerfile, docker-compose*.yml, Caddyfiles, PM2 ecosystem configs
```

"Agent Money Boilerplate" is the repository's public/README identity. The
running app's own UI branding and the `@agent-money-boilerplate/*` package
scope both use this same name now (renamed 2026-09-20, along with a
Portuguese "Elysia Finanças" name that preceded it).

## Stack

| Layer         | Technology                                                                            |
| ------------- | -------------------------------------------------------------------------------------- |
| Runtime / API | Bun + ElysiaJS                                                                        |
| ORM           | Prisma (dual schema: `schema.sqlite.prisma` and `schema.postgresql.prisma`)           |
| Validation    | Zod                                                                                   |
| Auth          | better-auth (cookie sessions, optional 2FA plugin)                                    |
| Frontend      | TanStack Start + Tailwind CSS v4                                                      |
| Mobile        | Expo + React Native + NativeWind (sessions via @better-auth/expo, no backend of its own) |
| Testing       | `bun:test` (unit/integration/smoke) + Playwright (E2E)                                |
| Lint/format   | Biome (tabs, 120-column lines)                                                        |

## End-to-end typing

The API and the frontend/mobile share types via
[Eden](https://elysiajs.com/eden/overview.html)
(`frontend/src/lib/api.ts` and `mobile/src/lib/api.ts` import the `App`
type exported by `backend/src/server.ts`) — any new backend route is
already typed on both clients without generating anything.

## `bunfig.toml`: why `install.linker = "hoisted"`

This pins a single `node_modules` tree (instead of bun's default
"isolated" linker) — **required for the Metro bundler (Expo) to work** in
this monorepo: under "isolated", Metro doesn't understand the symlink
structure inside `node_modules/.bun` (reproduced failures:
`"tracked as a non-empty directory"` in the file crawler, and
`MODULE_NOT_FOUND` loading Babel plugins).

Side effect (positive): hoisted resolution incidentally fixes an `elysia`
type duplication between `backend/` and `mobile/` that broke the Eden
`treaty<App>()` typecheck under "isolated". Side effect (negative):
`nativewind` (only `mobile/` depends on it) also gets hoisted to the root
and starts resolving the frontend's Tailwind CSS v4 instead of the v3 it
requires — patched in `mobile/metro.config.js` (commented there, along
with why `maxWorkers = 1` is also necessary). Don't remove `bunfig.toml`
without understanding these implications.

## `bun.lock`: why it must stay `"lockfileVersion": 1`

Android build images on EAS (used by `mobile/`) ship at most bun 1.3.14,
which doesn't understand the `"lockfileVersion": 2` format that bun >= 1.4
writes by default (reproduced error: `UnknownLockfileVersion` +
`lockfile had changes, but lockfile is frozen` during the build). Newer
bun (1.4.x, used in `infra/Dockerfile` and locally) reads the v1 format
fine — it just can't be the one that *generates* the lockfile.

Whenever you add or update a dependency, regenerate the lockfile with a
pinned bun version instead of the globally installed one:
`npx bun@1.3.14 install` (no global install needed — `npx`/`bunx` fetches
the right binary on demand). The `pre-commit` hook (`.husky/pre-commit`)
blocks the commit if a staged `bun.lock` has any `lockfileVersion` other
than 1. This restriction can be dropped once Expo ships a build image
with bun >= 1.4.

## Mobile: light/dark theme

`mobile/src/lib/theme.ts` wraps NativeWind's built-in `colorScheme`
controller (`tailwind.config.js` sets `darkMode: "class"`, required for
manual toggling — with the default `"media"` it only ever follows the OS
setting) with persistence via `expo-secure-store`. `useApplyStoredTheme()`
runs once at the root layout; every screen/component reads
`useAppColorScheme()` for `{ colorScheme, isDark, setTheme }`.

`dark:` Tailwind variants only affect `className`, but several shared UI
atoms (`Button`, `Chip`, `TextField`, `DateField`) pass raw hex colors
through `style={{ ... }}` props to third-party components (reacticx's
`Button`, the `AnimatedInputBar` input) that don't accept `className`.
Those components call `useAppColorScheme()` directly and branch the hex
value in JS instead — keep that pattern for any new shared atom that also
takes color via a `style` prop, rather than assuming `dark:` classes will
reach it.

## Docker/Railway build note

`bun.lock`'s `patchedDependencies` entry for `nativewind` (declared in the
root `package.json`, only actually needed by `mobile/`) applies to every
`bun install` run against this workspace, including inside
`infra/Dockerfile`'s `install` stage, which never copies `mobile/` itself.
The Dockerfile must still `COPY patches ./patches` before `bun install
--frozen-lockfile`, or the install fails with `Couldn't find patch file`
(this broke the Railway deploy once — see `docs/deploy-railway.md`).
