# CLAUDE.md

Guide for Claude Code (and any AI agent) working in this repository.

## Must-follow rules

1. **English only** — code, identifiers, comments, docs, commit messages,
   everything. If you find Portuguese in this app's context (a holdover
   from before the 2026-09-20 rename), translate it to English as you
   touch that file — don't leave new Portuguese behind either.
2. **Use this project's skills** (`.agents/skills/`) whenever relevant —
   in particular `git-branch-workflow` before any commit/push, and
   `open-source-guidelines-pre-push` before every `git push`.
3. **Follow open source practice**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
   (enforced by `.husky/commit-msg`), [SemVer](https://semver.org/), and
   the PR checklist in [`CONTRIBUTING.md`](./CONTRIBUTING.md).
4. **No obvious comments** — only the _why_ when it's non-obvious. Tabs,
   not spaces (Biome owns formatting, `bun run format`).
5. Only the root `CHANGELOG.md` ([Keep a Changelog](https://keepachangelog.com/en/1.1.0/))
   is kept — add each change under `## [Unreleased]`; never create
   per-workspace changelogs. Never commit `*.csv` (real
   bank statements have leaked before — see
   [`docs/security.md`](./docs/security.md)).
6. `.claude/settings.json` is shared project config and stays tracked —
   only `.claude/worktrees/` is gitignored.
7. **Karpathy guidelines** ([`.claude/rules/karpathy.md`](./.claude/rules/karpathy.md))
   apply to every coding task: think first, simplest change, surgical
   diffs, verify against a stated goal.

## Project at a glance

**Agent Money Boilerplate** — a forkable personal finance boilerplate: one
ElysiaJS backend consumed by a TanStack Start web dashboard, a Telegram
bot, an Expo mobile app and an Electron desktop app, all sharing one
auth/database (web, bot and mobile typed end-to-end via Eden; the desktop
app wraps the web dashboard).

```text
/backend/ /frontend/ /bot/ /mobile/ /desktop-electronjs/  — the 5 workspaces
/scripts/  — dev.ts (whole local stack), qa.ts (QA/pentest pass)
/infra/    — Dockerfile, docker-compose, Caddy, PM2 configs
/setups/   — setup/deploy shell scripts
/docs/     — architecture, conventions, commands, deploy guides
```

## Deeper docs

Start at [`docs/README.md`](./docs/README.md) — index of the knowledge base:
architecture, code conventions, tooling, commands, workflows, security
audit, mobile design system, ADRs (`docs/decisions/`) and deploy guides
(`docs/deploy/`). Work in progress and next steps: [`PLAN.md`](./PLAN.md).

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — branch workflow, commits, SemVer, PR checklist
- [`.agents/skills/git-branch-workflow/SKILL.md`](./.agents/skills/git-branch-workflow/SKILL.md) — branch rules
- [`.agents/skills/open-source-guidelines-pre-push/SKILL.md`](./.agents/skills/open-source-guidelines-pre-push/SKILL.md) — pre-push checklist
- [`.agents/skills/qa-pentest/SKILL.md`](./.agents/skills/qa-pentest/SKILL.md) — running and extending `scripts/qa.ts`
- [`.claude/skills/`](./.claude/skills) — vendored engineering and Expo skills (sources in `SOURCES.md`)

## Key commands

```bash
bun run dev:all      # backend + web + Expo (LAN IP injected) + desktop app
bun run qa           # QA/pentest pass on a seeded throwaway stack (Android emulator included)
bun run check        # lint + typecheck + unit tests
```
