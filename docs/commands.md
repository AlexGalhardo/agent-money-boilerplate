# Commands

Run from the monorepo root unless noted otherwise.

## Everyday dev

```bash
bun install                 # install everything (all workspaces)
bun run backend:dev         # API at http://localhost:4000
bun run frontend:dev        # frontend at http://localhost:4001
bun run mobile:dev          # Expo dev server (Metro) — scan the QR with Expo Go
bun run lint                # biome check
bun run typecheck:backend   # tsc --noEmit for the API
bun run typecheck:frontend  # tsc --noEmit for the frontend
bun run typecheck:mobile    # tsc --noEmit for the mobile app
```

## Backend tests

```bash
cd backend
bun run test:unit           # *.unit.test.ts only, no database needed
bun run test                # unit + integration (spins up a test sqlite db first)
bun run db:seed             # seed the database (see backend/prisma/seed.ts)
bun run db:deploy && bun run db:generate   # apply migrations + generate the Prisma Client
```

Run one specific test:

```bash
cd backend
bun test src/modules/transactions/transaction.service.unit.test.ts
```

## Mobile tests

```bash
cd mobile
bun run test          # jest, src/**/*.test.ts
bun run typecheck     # tsc --noEmit
bun run test:e2e      # Maestro flows in mobile/maestro/ - needs a running
                       # simulator/emulator and maestro installed, see
                       # mobile/maestro/README.md
```

## Before opening a PR / calling something done

The `pre-push` hook runs this automatically; to check manually:

```bash
(cd backend && bunx --bun tsc --noEmit && bun run test:setup && bun run test && bun run build)
(cd frontend && bunx --bun tsc --noEmit && bun run build)
```

And, if the change touched E2E-covered routes:

```bash
cd frontend && bunx playwright test
```

Never use `--no-verify` to skip Husky hooks without confirming with
whoever asked for the task. Full PR checklist: [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Full local setup (from scratch)

Four variants depending on OS and whether you want Docker — all ask
interactively for SQLite or Postgres, or accept the database as an
argument to skip the prompt (e.g. `./setups/setup-docker.sh postgres`):

- [`./setups/setup-docker.sh`](../setups/setup-docker.sh) — Linux/macOS, brings up backend+frontend+bot via Docker Compose
- [`./setups/setup-pm2.sh`](../setups/setup-pm2.sh) — Linux/macOS, runs the 3 with PM2, no Docker
- [`./setups/setup-docker.sh`](../setups/setup-docker.sh) — Windows 11 + WSL2, via Docker Desktop
- [`./setups/setup-pm2.sh`](../setups/setup-pm2.sh) — Windows 11 + WSL2, with PM2, no Docker

Details for each in [`setup-unix-using-docker.md`](./setup-unix-using-docker.md),
[`setup-unix-using-pm2.md`](./setup-unix-using-pm2.md),
[`setup-windows-using-docker.md`](./setup-windows-using-docker.md) and
[`setup-windows-using-pm2.md`](./setup-windows-using-pm2.md).
