# Tooling

What checks the code, where it's configured, and the traps each tool has.

## Formatting and linting

| Tool                                                                      | Scope             | Config                                                        |
| ------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------- |
| [Biome](https://biomejs.dev) 2.5                                          | TS, JS, JSON, CSS | `biome.json` (reads `.editorconfig`)                          |
| [Prettier](https://prettier.io) 3.9                                       | Markdown only     | `.prettierrc.json`, `.prettierignore`                         |
| [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) 0.23 | Markdown rules    | `.markdownlint-cli2.jsonc`                                    |
| [EditorConfig](https://editorconfig.org)                                  | Editors           | `.editorconfig` — tabs width 4; spaces (2) for `*.md`/`*.yml` |

```bash
bun run lint        # biome check + markdownlint + prettier --check (what CI and pre-commit run)
bun run lint:fix    # biome --write + markdownlint --fix + prettier --write
bun run format      # formatters only
```

- Vendored skills (`.claude/skills`, `.claude/agents`, `.claude/references`,
  `.agents/skills`) are excluded from every tool — they mirror upstream.
- Prettier owns Markdown layout; markdownlint rules that fight it
  (`MD013` line length, `MD060` table style, emphasis/list markers) are off.
- Run Biome through the project (`bun run lint` or `bunx biome`), **never
  `npx biome`** — npm resolves an unrelated package named `biome`.

## Commits and hooks (Husky)

| Hook         | Runs                                                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `pre-commit` | blocks staged `*.exe` and `*.csv`, blocks a `bun.lock` that isn't `lockfileVersion: 1`, `bun run lint`                     |
| `commit-msg` | [commitlint](https://commitlint.js.org) with `@commitlint/config-conventional` + the `merge` type (`commitlint.config.js`) |
| `pre-push`   | backend typecheck + tests + build, frontend typecheck + build                                                              |

commitlint traps worth knowing (see the `agent-money-ship` skill):

- `subject-case`: the subject can't start with an uppercase word —
  `feat(api): add OpenAPI…` passes, `feat(api): OpenAPI spec…` fails.
- `header-max-length` 100, `body-max-line-length` 100.
- Breaking changes: `type(scope)!:` **and** a `BREAKING CHANGE:` footer.

Never bypass hooks with `--no-verify` without the maintainer's explicit OK.

## Package management

- **Bun** runs everything; `bunfig.toml` pins the hoisted linker (Metro
  needs it).
- **Lockfile v1**: EAS images use bun 1.3.14, which can't read v2. Add or
  update dependencies only with `npx bun@1.3.14 add --exact <pkg>@<version>`
  (or `npx bun@1.3.14 install`). The pre-commit hook rejects v2.
- **Exact stable versions** — no `^`/`~`, no `latest`/`next`/`beta`. Look
  up the current stable with `npm view <pkg> version dist-tags`.
- **Moved the repo?** Workspace links in `node_modules/@agent-money-boilerplate/*`
  are absolute symlinks — after moving the folder, `npx bun@1.3.14 install`
  again or typecheck fails with "Cannot find module" /
  "Please install Elysia before using Eden".
- Audit: `bun audit`; triage by reachability and record deferrals in
  [`security.md`](./security.md#accepted--deferred).

## TypeScript

Each workspace has its own `tsconfig.json` (`strict`, and
`noUncheckedIndexedAccess` in the backend). `bun run typecheck` checks all
four. The backend and bot need a generated Prisma Client first
(`cd backend && bun run db:generate`).

## Tests

| Workspace  | Runner           | Command                               | Notes                                         |
| ---------- | ---------------- | ------------------------------------- | --------------------------------------------- |
| backend    | `bun:test`       | `bun run backend:test`                | Resets `backend/test.db` first (`test:setup`) |
| bot        | `bun:test`       | `bun run bot:test`                    | Uses `bot/.env.test`                          |
| frontend   | `bun:test`       | `bun run frontend:test`               | Pure `lib/` helpers                           |
| mobile     | Jest (jest-expo) | `bun run mobile:test`                 | `src/**/*.test.ts(x)`                         |
| web E2E    | Playwright       | `cd frontend && bunx playwright test` | Backend `:4200`, Vite `:4201`, reseeded DB    |
| mobile E2E | Playwright       | `cd mobile && bun run test:e2e:web`   | Backend `:4210`, Expo web export `:4301`      |
| native E2E | Maestro          | `cd mobile && maestro test maestro/`  | Emulator/device required                      |
| desktop    | Electron smoke   | `bun run desktop:smoke`               | Boots the window, exits 0 once a page renders |
| QA/pentest | `scripts/qa.ts`  | `bun run qa`                          | API `:4400`, web `:4401`, Metro `:8091`       |

Both Playwright configs and `bun run qa` reseed the E2E database
(`backend/e2e.db`), so don't run them at the same time. The seed is deterministic (fixed-seed PRNG).

## Expo / Metro

- `EXPO_PUBLIC_*` values are inlined at transform time — pass `--clear` to
  `expo export`/`expo start` after changing them.
- `npx expo export --platform android` is the fastest way to prove the
  native bundle (NativeWind classes included) compiles without a device.
