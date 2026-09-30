# CI/CD

GitHub Actions is the quality gate; Railway deploys only commits that pass
it; EAS builds the mobile app. Everything runs from the two long-lived
branches (see `.agents/skills/git-branch-workflow`).

```text
push dev  ─┬─ ci.yml ───────────► Railway "sandbox" (waits for CI)
           └─ mobile-build.yml ─► EAS preview build (.apk)
push main ─┬─ ci.yml ───────────► Railway "production" (waits for CI)
           └─ mobile-build.yml ─► EAS production build (.aab, submit is manual)
tag v*    ─── release.yml ──────► GitHub Release with every downloadable attached
manual    ─── release.yml ──────► same builds as workflow artifacts, no release
```

## Workflows

### `ci.yml` (push to `main`/`dev`, pull requests)

| Job          | Runs                                                                           |
| ------------ | ------------------------------------------------------------------------------ |
| `lint`       | `bun run lint` — Biome + markdownlint + Prettier check                         |
| `backend`    | Prisma generate, typecheck, unit + integration tests, binary build             |
| `bot`        | Prisma generate, typecheck, unit tests, binary build                           |
| `frontend`   | Prisma generate, typecheck, unit tests, production build                       |
| `mobile`     | Prisma generate, typecheck, Jest                                               |
| `e2e`        | Playwright on the web app against a seeded API (needs backend, frontend)       |
| `mobile-e2e` | Playwright on the Expo web build against a seeded API (needs backend, mobile)  |
| `desktop`    | Typecheck, package the Linux app unpacked, smoke-boot it under `xvfb`          |
| `qa`         | `scripts/qa.ts` (API, web, desktop, bot) on a seeded stack; uploads the report |

`lint` also typechecks `scripts/` (`dev.ts`, `qa.ts`). Cross-platform
packaging lives in `release.yml`, not here, so a macOS/Windows runner
hiccup never blocks a Railway deploy.

Every job installs with `bun install --frozen-lockfile` — the lockfile must
be committed in sync (and stay `lockfileVersion: 1`, see
[`../tooling.md`](../tooling.md)). Jobs that typecheck need
`bun run db:generate` first: the Prisma Client is generated, not committed.

### `mobile-build.yml` (push touching `mobile/`, `backend/`, `bun.lock`)

Queues an EAS build with `--no-wait` (`preview` on `dev`, `production` on
`main`). Needs the `EXPO_TOKEN` repository secret. EAS builds count against
the Expo account's quota. `eas submit` is intentionally manual.

### `release.yml` (tag `v*`, or manual run)

| Job        | Runner(s)                                | Output                                                                                     |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `binaries` | ubuntu x64, ubuntu arm64, macOS, Windows | `agent-money-backend-<os>-<arch>` and `agent-money-bot-…` (Bun `--compile`, PostgreSQL)    |
| `electron` | Windows, Ubuntu, macOS                   | NSIS installer, AppImage, ad hoc signed `.app` zip — each smoke-booted                     |
| `android`  | Ubuntu                                   | `agent-money-android.apk` (`expo prebuild` + Gradle, debug-keystore signed, sideload only) |
| `ios`      | macOS                                    | `agent-money-ios-simulator.zip` (`xcodebuild -sdk iphonesimulator`, unsigned)              |
| `publish`  | Ubuntu (tags only)                       | GitHub Release with all files + `SHA256SUMS.txt` and generated notes                       |

Binaries compile on their own OS because `@libsql/client` ships a native
addon per platform. Repository variables `DESKTOP_APP_URL` (desktop app)
and `MOBILE_API_URL` (APK/iOS build) override the production URLs baked
into the builds. Store builds (signed AAB/IPA) stay on EAS
(`mobile-build.yml`). `-alpha`/`-beta` tags become pre-releases. Tag after merging to `main` when the change deserves a
release — see [`../workflows.md`](../workflows.md#releasing).

## Railway gate

Production services have **Wait for CI** on (`source.checkSuites=true`):
Railway builds a commit only after its whole check suite is green. A red
job — even an unrelated flaky E2E test — silently blocks production
deploys (the deploy shows `SKIPPED`), so keep CI green and deterministic
(the seed is deterministic for that reason).

| Railway environment | Branch | URLs                                                                          |
| ------------------- | ------ | ----------------------------------------------------------------------------- |
| `production`        | `main` | `moneyzin-backend.up.railway.app`, `moneyzin-frontend.up.railway.app`         |
| `sandbox`           | `dev`  | `backend-sandbox-b61e.up.railway.app`, `frontend-sandbox-972e.up.railway.app` |

## Secrets

| Secret       | Where               | Used by            |
| ------------ | ------------------- | ------------------ |
| `EXPO_TOKEN` | GitHub repo secrets | `mobile-build.yml` |

App secrets live in Railway variables per environment, never in GitHub.

## Open items

- [ ] The `sandbox` environment inherited production's Resend and Google
      OAuth keys when it was duplicated — replace them with test keys (or
      authorize the sandbox URL as a Google redirect URI).
- [ ] Maestro on an Android emulator in CI (costs Actions minutes; needs a
      decision).
- [x] Upgrade `actions/checkout@v4` → `@v7` (Node 24) and pin bun `1.4.2`.
- [ ] First `release.yml` run: validate the Android/iOS native builds and
      the macOS/Windows Electron jobs (never run yet — only the Windows
      installer was built and smoke-tested locally).
- [ ] Code signing: Windows (SmartScreen), macOS Developer ID +
      notarization, a real Android upload keystore for GitHub APKs.
