# CI/CD

GitHub Actions is the quality gate; Railway deploys only commits that pass
it; EAS builds the mobile app. Everything runs from the two long-lived
branches (see `.agents/skills/git-branch-workflow`).

```text
push dev  ─┬─ ci.yml ───────────► Railway "sandbox" (waits for CI)
           └─ mobile-build.yml ─► EAS preview build (.apk)
push main ─┬─ ci.yml ───────────► Railway "production" (waits for CI)
           └─ mobile-build.yml ─► EAS production build (.aab, submit is manual)
tag v*    ─── release.yml ──────► GitHub Release with generated notes
```

## Workflows

### `ci.yml` (push to `main`/`dev`, pull requests)

| Job          | Runs                                                                          |
| ------------ | ----------------------------------------------------------------------------- |
| `lint`       | `bun run lint` — Biome + markdownlint + Prettier check                        |
| `backend`    | Prisma generate, typecheck, unit + integration tests, binary build            |
| `bot`        | Prisma generate, typecheck, unit tests                                        |
| `frontend`   | Prisma generate, typecheck, unit tests, production build                      |
| `mobile`     | Prisma generate, typecheck, Jest                                              |
| `e2e`        | Playwright on the web app against a seeded API (needs backend, frontend)      |
| `mobile-e2e` | Playwright on the Expo web build against a seeded API (needs backend, mobile) |

Every job installs with `bun install --frozen-lockfile` — the lockfile must
be committed in sync (and stay `lockfileVersion: 1`, see
[`../tooling.md`](../tooling.md)). Jobs that typecheck need
`bun run db:generate` first: the Prisma Client is generated, not committed.

### `mobile-build.yml` (push touching `mobile/`, `backend/`, `bun.lock`)

Queues an EAS build with `--no-wait` (`preview` on `dev`, `production` on
`main`). Needs the `EXPO_TOKEN` repository secret. EAS builds count against
the Expo account's quota. `eas submit` is intentionally manual.

### `release.yml` (tag `v*`)

Creates a GitHub Release with generated notes; `-alpha`/`-beta` tags become
pre-releases. Tag after merging to `main` when the change deserves a
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
- [ ] Upgrade `actions/checkout@v4` → a Node 24 release before GitHub drops
      Node 20 runners (warnings on every run since 2026-09).
