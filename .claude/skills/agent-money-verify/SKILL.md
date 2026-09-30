---
name: agent-money-verify
description: >
  Verify a change in the Agent Money monorepo and manage dependencies without
  breaking the bun lockfile. Use before calling any task done, before a commit
  or push, when adding/updating a dependency, or when `bun.lock` shows up in a
  diff.
---

# Verify a change (Agent Money)

## Pick the smallest check that proves the change

| Touched                         | Run                                                          |
| ------------------------------- | ------------------------------------------------------------ |
| Anything                        | `bun run lint`                                               |
| One workspace                   | `bun run typecheck:<backend\|frontend\|bot\|mobile\|desktop>` |
| `scripts/`                      | `bun run typecheck:scripts`                                  |
| Backend logic                   | `bun run backend:test` (integration needs `test:setup`)      |
| Bot / frontend / mobile logic   | `bun run bot:test` / `frontend:test` / `mobile:test`         |
| Web routes or flows             | `cd frontend && bunx playwright test`                        |
| Mobile screens                  | `cd mobile && bun run test:e2e:web`                          |
| Auth, payments, bot, release    | `bun run qa` (see `.agents/skills/qa-pentest`)               |
| Several workspaces / before push | `bun run check` (lint + typecheck + unit tests)             |

Builds: `bun run --cwd backend build`, `bun run --cwd frontend build`. The
`pre-push` hook runs the backend/frontend typecheck, tests and builds.

Report the command and its result. Red before your change? Say so — record
the baseline first when in doubt (`git stash`, run, `git stash pop`).

## Dependencies and the lockfile

- `bun.lock` must stay `lockfileVersion: 1`: EAS build images ship bun
  1.3.14, which can't read v2. The pre-commit hook rejects v2.
- Install: `npx bun@1.3.14 install`. Add: `npx bun@1.3.14 add --exact <pkg>@<version>`
  in the workspace folder — latest **stable** version, exact pin, never a
  range or pre-release. Ask before adding a new dependency.
- Stale workspace symlinks (typecheck red for no reason after moving the
  repo) → `npx bun@1.3.14 install` again.

Details: `docs/tooling.md`, `docs/commands.md`.
