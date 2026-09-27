# PLAN.md — Full check-up (2026-09-27)

Single source of truth for the check-up/refactor started on 2026-09-27 with
Claude Opus 5.5. Every micro-task has a checkbox — tick it in the same commit
that does the work, so any future session/agent can resume from here without
re-deriving context.

Branch: `dev` (see `.agents/skills/git-branch-workflow`). Nothing lands on
`main` until the final checkpoint is green.

## How to resume

1. Read this file top to bottom, then `CLAUDE.md`.
2. Find the first unchecked box — that's where work stopped.
3. Run the baseline (`bun run check` — lint + typecheck + tests, see
   `docs/commands.md`) before changing anything, so you know what was
   already red.

## Skills used (mandatory, from `.claude/skills/`)

Each group lists the skills that drive it. They are not decoration — open
the `SKILL.md` before starting the group.

| Skill                                                                                    | Where it applies                                                |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `using-agent-skills`                                                                     | Session start: pick the right skill per phase                   |
| `planning-and-task-breakdown`                                                            | This file (structure, checkpoints, task sizing)                 |
| `context-engineering`                                                                    | CLAUDE.md/AGENTS.md slimming, `docs/` layout, project skills    |
| `security-and-hardening` (+ `.claude/references/security-checklist.md`)                  | Group 2 — OWASP Top 10 audit and fixes                          |
| `doubt-driven-development`                                                               | Group 2 — every security fix that changes behavior              |
| `code-review-and-quality`                                                                | Groups 3–6 — five-axis review of each workspace                 |
| `code-simplification` / `ponytail`                                                       | Groups 3–6 — KISS/DRY/YAGNI, deleting dead code                 |
| `api-and-interface-design`                                                               | Group 3 — backend error contract, module boundaries             |
| `test-driven-development`                                                                | Groups 2–5 — regression test first for every bug/security fix   |
| `incremental-implementation`                                                             | Every group — one slice, verify, commit                         |
| `frontend-ui-engineering` / `impeccable` / `minimalist-ui`                               | Group 6 — mobile dark redesign                                  |
| `browser-testing-with-devtools`                                                          | Groups 5–7 — runtime verification of web flows                  |
| `ci-cd-and-automation`                                                                   | Group 1 — hooks, lint/format pipeline, CI                       |
| `git-workflow-and-versioning`                                                            | Every commit — Conventional Commits, SemVer, changelog          |
| `documentation-and-adrs`                                                                 | Group 8 — `docs/` rewrite, ADRs in `docs/decisions/`            |
| `source-driven-development`                                                              | Library choices (Prettier, markdownlint, Expo) — verify on docs |
| Project skills (`.agents/skills/git-branch-workflow`, `open-source-guidelines-pre-push`) | Before every commit / push                                      |

## Architecture decisions taken in this check-up

- **Markdown formatting**: Prettier (formats `*.md`) + markdownlint-cli2
  (lints). Biome keeps owning TS/JS/JSON/CSS. YAML/Markdown use spaces
  (YAML forbids tabs); everything else tabs, width 4 (`.editorconfig`).
- **Telegram linking** only through authenticated flows (bot login with
  credentials, or the single-use web token). Linking by pasting an account
  ID (bot) or a chat ID (web) is removed — both were unauthenticated
  account takeovers (see `docs/security.md`).
- **Backend errors**: domain errors extend one `AppError` (with an HTTP
  status) and a single `onError` maps them — no per-route try/catch.
- **Mobile theme**: dark-only, design tokens in `tailwind.config.js`,
  pure NativeWind primitives (the light/dark toggle is removed).
- **CHANGELOG.md** at the root follows Keep a Changelog 1.1.0; the stale
  `mobile/CHANGELOG.md` (described a pre-monorepo architecture that no
  longer exists) is removed — its history lives in git.

---

## Group 0 — Context and baseline

Skills: `using-agent-skills`, `context-engineering`

- [x] Read CLAUDE.md, AGENTS.md, docs/, project skills, every workspace
- [x] Record baseline: lint had 181 errors (vendored `.claude/skills`), frontend/bot/mobile typecheck red (stale `node_modules` symlinks pointing at the old project path), backend tests 76/76, bot 55/56, mobile 21/21
- [x] Branch `dev` reset onto `main`
- [x] Flag untracked `scripts/test.ts`: hardcoded production API key (never commit; rotate the key)

## Group 1 — Tooling (formatter, linter, hooks)

Skills: `ci-cd-and-automation`, `source-driven-development`, `git-workflow-and-versioning`

- [x] Reinstall deps with `npx bun@1.3.14 install` (fixes workspace symlinks; lockfile stays v1)
- [x] Biome: exclude vendored `.claude/skills`, `.claude/agents`, `.claude/references`; confirm tab + width 4 matches `.editorconfig`
- [x] `.editorconfig`: spaces for `*.md`/`*.yml` (YAML forbids tabs)
- [x] Add Prettier (markdown only) + markdownlint-cli2, wire into `lint`, `lint:fix`, `format`
- [x] commitlint: add `@commitlint/cli` + `config-conventional` devDeps (the hook calls them), keep the `merge` type used by this repo
- [x] Root `check` script (lint + typecheck all + unit tests)
- [x] Translate hook messages (`.husky/pre-commit`) to English
- [x] Verify: `bun run lint` green, all 4 `typecheck:*` green

## Group 2 — Security (OWASP Top 10 2021)

Skills: `security-and-hardening`, `doubt-driven-development`, `test-driven-development`

- [x] **A01** Bot "link by account ID" lets anyone who knows an account ID take over that account from Telegram → remove
- [x] **A01** `PUT /users/me` accepts any `telegramChatId` → only allow unlinking (`""`); web UI shows link status + unlink only
- [x] **A07** Bot e-mail/password login calls `auth.api` directly (no HTTP rate limit) → per-chat lockout on failed logins
- [x] **A02** `user.autoGeneratedPassword` stored in plaintext → encrypt at rest (AES-256-GCM, same key as transactions)
- [x] **A01/A02** `GET /users/me` returns the whole user row → explicit DTO
- [x] **A02** Webhook/cron secrets compared with `!==` → constant-time compare
- [x] **A08** Webhook body trusted via cast → Zod schema
- [x] **A04** Unbounded inputs: CSV preview size, search length, bot description length (bot bypassed route validation) → limits + shared schema
- [x] **A04** Telegram link token redeem is check-then-delete (race) → atomic delete
- [x] **A03** User-controlled names interpolated into Telegram `Markdown` messages → escape
- [x] **A05** Frontend server sends no security headers → CSP-lite, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS
- [x] **A05** `image` accepts any URL scheme → http(s) only
- [x] **A06** `xlsx@0.18.5` (abandoned on npm, known CVEs) → replace
- [x] **A09** Recipient e-mail removed from logs; upstream errors logged server-side only
- [x] **A07** Real personal credentials hardcoded in `backend/prisma/seed.ts` → env vars (rotation pending, see `docs/security.md`)
- [x] **A03** CSV/XLSX export formula injection → neutralized cells
- [x] Write `docs/security.md` (audit report: finding, severity, fix, status)
- [x] Verify: regression tests for each behavior change, full backend suite green

### Checkpoint A (after Groups 1–2)

- [ ] lint + typecheck + backend/bot/mobile tests green
- [ ] Commit(s) on `dev`

## Group 3 — Backend refactor

Skills: `code-review-and-quality`, `api-and-interface-design`, `code-simplification`

- [x] `AppError` hierarchy + single error mapper in `server.ts`; delete per-route try/catch
- [x] Separate `app` construction from `.listen()` (tests/bot import without binding a port)
- [x] `userRepository` / plan quota logic in one place (DRY: free-limit check duplicated in create + import)
- [x] Payments: services go through a repository instead of raw `prisma` in routes
- [x] Validate route params (`/payments/pix/:id`)
- [x] Translate Portuguese comments/messages in code to English (user-facing API messages stay pt-BR only where shown to end users)
- [x] Fix stale `backend/.env.example` (FRONTEND_URL missing, dead vars)
- [ ] Verify: `bun run test`, `bun run build`

## Group 4 — Bot refactor

Skills: `code-review-and-quality`, `code-simplification`

- [x] `withAuthorizedUser` wrapper replaces the ensureUserReady + requirePassword preamble repeated in 6 conversations
- [x] Shared `categoryKeyboard` (duplicated in add + search)
- [x] Validate bot input with the backend Zod schema before calling services
- [x] Translate comments to English; fix the failing test
- [ ] Verify: `bun run bot:test`, `typecheck:bot`

## Group 5 — Frontend refactor

Skills: `code-review-and-quality`, `frontend-ui-engineering`, `vercel-react-best-practices`

- [ ] Split `dashboard/index.tsx` (627 lines) and `minha-conta.tsx` into focused components
- [ ] Minha conta: replace chat-ID input with link status + unlink (Group 2)
- [ ] Translate comments to English
- [ ] Verify: `typecheck:frontend`, `frontend:build`, Playwright E2E

### Checkpoint B (after Groups 3–5)

- [ ] Everything green, E2E green, commit

## Group 6 — Mobile: dark-only professional redesign

Skills: `impeccable`, `frontend-ui-engineering`, `minimalist-ui`, `expo` skills (`.claude/skills/expo-*`), `vercel-react-native-skills`

- [ ] Design tokens (dark palette, type scale, radii) in `tailwind.config.js`
- [ ] Remove light theme + toggle (`lib/theme.ts`, `dark:` variants), `userInterfaceStyle: "dark"`
- [ ] Rebuild UI primitives with pure NativeWind (Button, TextField, Chip, DateField, Card, Screen)
- [ ] Redesign auth screens (login, signup, forgot, reset)
- [ ] Redesign app screens (dashboard, search, transaction form, profile, subscription, 2FA, import)
- [ ] Remove unused reacticx copies once nothing imports them
- [ ] Keep every `testID`/`accessibilityLabel` used by `mobile/maestro/*.yaml`
- [ ] Verify: `typecheck:mobile`, `mobile:test`, `expo export` bundles, screenshots via Expo web

## Group 7 — Mobile E2E

Skills: `test-driven-development`, `browser-testing-with-devtools`

- [ ] Keep Maestro as the native E2E runner (flows in `mobile/maestro/`)
- [ ] Run flows on an emulator — **blocked here**: no Android SDK/Java/Maestro on this machine (see chat suggestion)
- [ ] Add CI job that runs Maestro on an Android emulator (optional, needs user confirmation — CI minutes)

## Group 8 — Docs, changelog, skills

Skills: `documentation-and-adrs`, `context-engineering`, `git-workflow-and-versioning`

- [ ] Vendor Expo skills (`github.com/expo/skills`) into `.claude/skills/`, record commit in `SOURCES.md`
- [ ] Translate `.claude/skills/SOURCES.md` to English; drop skills written for another project (`respondeae-*`)
- [ ] Write project skills for repeated workflows (verify-all, monorepo install/lockfile, add-category sync points, security fix)
- [ ] `CHANGELOG.md` (Keep a Changelog) from git history v0.0.1 → v0.1.0 + Unreleased; delete `mobile/CHANGELOG.md`
- [ ] `docs/` reorganized: `README.md` index, `tooling.md`, `architecture.md`, `workflows.md`, `security.md`, `decisions/` (ADRs), `deploy/` (setup/deploy guides)
- [ ] Update CLAUDE.md + AGENTS.md (changelog rule, new commands, skills locations)

## Group 9 — Final verification and handoff

Skills: `code-review-and-quality`, `shipping-and-launch`, `open-source-guidelines-pre-push`

- [ ] `bun run check` green; backend build; frontend build; Playwright E2E
- [ ] Commits follow Conventional Commits; no secrets staged (`git diff --cached`)
- [ ] Summary + open questions reported to the user (merge to `main`/push only after user confirmation)

## Risks

| Risk                                                            | Impact           | Mitigation                                                                               |
| --------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| Removing "link by ID" breaks users who relied on it             | Med              | Token/Google flow and e-mail login still link; documented in CHANGELOG as a security fix |
| Encrypting `autoGeneratedPassword` needs existing rows migrated | Low              | Decrypt falls back to treating legacy plaintext values as plaintext                      |
| Mobile redesign can't be run on a device here                   | Med              | Typecheck + Metro export + Expo web screenshots; Maestro selectors preserved             |
| `bun.lock` rewritten to v2 by a newer bun                       | High (EAS build) | Only regenerate with `npx bun@1.3.14 install`; pre-commit guard                          |

## Open questions (for the user)

- Rotate the API key hardcoded in the untracked `scripts/test.ts` and delete the file?
- Install Android Studio + Maestro locally (or add a CI emulator job) to actually run mobile E2E?
- The bot's `BOT_PASSWORD_HASH_BASE64` is one global password shared by every user of a multi-tenant bot — keep, or remove the feature?
