# Commands

Run from the repository root unless noted.

## Everyday

```bash
npx bun@1.3.14 install      # install all workspaces (keeps bun.lock at v1)
bun run backend:dev         # API        http://localhost:4000 (spec at /openapi/json)
bun run frontend:dev        # web        http://localhost:4001 (API reference at /api)
bun run bot:dev             # Telegram bot (needs bot/.env)
bun run mobile:dev          # Expo dev server
bun run desktop:dev         # Electron desktop app (loads http://localhost:4001)
bun run dev:all             # all of the above except the bot, Expo pointed at the LAN IP
```

## Verify

```bash
bun run check               # lint + typecheck (5 workspaces + scripts/) + unit tests — run before every commit
bun run lint                # Biome + markdownlint + Prettier check
bun run lint:fix            # apply fixes
bun run typecheck           # or typecheck:backend | :frontend | :bot | :mobile
bun run test                # backend + bot + frontend + mobile unit/integration tests
cd frontend && bunx playwright test      # web E2E
cd mobile && bun run test:e2e:web        # mobile E2E on the Expo web build
cd mobile && maestro test maestro/       # native E2E (emulator/device)
bun run qa                               # QA/pentest pass: API, web, desktop, bot, Android emulator
bun scripts/qa.ts --only api,web --report qa-report.md --shots qa-shots   # against running servers
```

What `pre-push` runs (and CI mirrors):

```bash
(cd backend && bunx --bun tsc --noEmit && bun run test:setup && bun run test && bun run build)
(cd frontend && bunx --bun tsc --noEmit && bun run build)
```

## Backend

```bash
cd backend
bun run test:unit                     # *.unit.test.ts, no database
bun run test                          # unit + integration (resets test.db)
bun test src/lib/plan.unit.test.ts    # one file
bun run db:generate                   # Prisma Client for SQLite (db:generate:postgres for Postgres)
bun run db:migrate                    # new migration (dev) — replicate schema changes in both schema files
bun run db:deploy                     # apply migrations (db:deploy:postgres)
bun run db:seed                       # demo data — refuses NODE_ENV=production
bun run db:studio                     # Prisma Studio http://localhost:5555
bun run scripts/encrypt-auto-generated-passwords.ts   # one-off migration, idempotent
curl localhost:4000/openapi/json      # generated OpenAPI spec
```

## Mobile

```bash
cd mobile
bun run test                                                    # Jest
bunx tsc --noEmit                                               # typecheck
EXPO_PUBLIC_API_URL=http://localhost:4000 npx expo export --platform android --clear   # prove the native bundle compiles
bun run build:apk | build:aab | submit:play-store               # EAS (paid/quota) — see docs/deploy/android.md
```

## Desktop

```bash
bun run desktop:dev                   # build main process + open the window
bun run desktop:smoke                 # CI-style boot check
bun run desktop:dist                  # installer for the current OS in desktop-electronjs/release/
DESKTOP_APP_URL=https://… bun run desktop:dev   # or --url; default package.json "appUrl"
```

## Release builds

`release.yml` (tag `v*`, or run manually) builds the Bun executables for
backend and bot (linux x64/arm64, macOS arm64, Windows x64), the Electron
app (Windows NSIS, Linux AppImage, macOS zip), the Android APK (`expo
prebuild` + Gradle) and the iOS simulator app (`xcodebuild`). See
[`deploy/ci-cd.md`](./deploy/ci-cd.md).

## Local stack / deploy

```bash
./setups/setup-docker.sh [sqlite|postgres]    # everything in Docker Compose
./setups/setup-pm2.sh [sqlite|postgres]       # PM2, no Docker for the apps
bun run docker:sqlite:up | docker:postgres:up | docker:*:down
bun run pm2:start | pm2:start:bot | pm2:stop | pm2:restart | pm2:delete
```

Guides: [`deploy/local-setup.md`](./deploy/local-setup.md),
[`deploy/vps.md`](./deploy/vps.md), [`deploy/railway.md`](./deploy/railway.md),
[`deploy/android.md`](./deploy/android.md).
