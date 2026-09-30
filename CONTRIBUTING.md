# Contributing to Agent Money Boilerplate

Thanks for your interest in contributing. This document summarizes the
expected workflow for any change to this repository — human or AI agent.

## Before you start

1. Read [`CLAUDE.md`](./CLAUDE.md) — it describes the monorepo's
   architecture, stack and the code conventions this project follows
   closely, and links out to `docs/` for anything deeper.
2. Run `./setups/setup-docker.sh` (Docker Compose) or
   `./setups/setup-pm2.sh` (PM2, no Docker) to bring the environment up
   locally — both work on Linux, macOS and Windows 11 (WSL2 / Git Bash).
3. Open an [issue](../../issues) before starting any large change (a new
   feature, an architecture refactor) to align on the approach before
   investing time writing code. Small bugs and typos can go straight to a
   Pull Request.

## Branch workflow

This repository follows a strict two-branch flow — `main` (the only
long-lived branch) and `dev` (a disposable, per-task working branch). The
full rules, and why each one exists, are in
[`.agents/skills/git-branch-workflow/SKILL.md`](./.agents/skills/git-branch-workflow/SKILL.md).
Summary:

1. Branch off an up-to-date `main`.
2. Make your changes and commits there.
3. Run locally what the `pre-push` hook runs (see "Before opening a PR"
   below) — only open the PR once everything passes.
4. Open a Pull Request against `main`. Never commit directly to `main`,
   never force-push `main`.

## Commit messages — Conventional Commits

Every commit message **is validated automatically** by the
`.husky/commit-msg` hook and must follow
[Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>(<optional scope>): <description>

[optional body]

[optional footer, e.g. BREAKING CHANGE: ...]
```

Accepted types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert` — plus `merge`, used only for the commit
that merges `dev` into `main` (e.g. `merge: auth fix (dev -> main)`).

Examples:

```text
feat(transactions): add PDF report export
fix(e2e): fix the vite dev proxy in e2e mode
docs(deploy): document Railway environment variables
refactor(bot): extract verify-password-step into its own module
```

A change that breaks compatibility (see the versioning section below)
must include `BREAKING CHANGE: <explanation>` in the commit footer, or a
`!` after the type/scope (`feat(api)!: remove legacy endpoint`).

## Versioning — Semantic Versioning

This project follows [SemVer 2.0.0](https://semver.org/)
(`MAJOR.MINOR.PATCH`):

- **MAJOR** — an incompatible (breaking) change to the API, to the
  database schema in a way that can't be auto-migrated, or to the
  contracts between `backend`/`frontend`/`bot`/`mobile`.
- **MINOR** — a new backwards-compatible feature.
- **PATCH** — a backwards-compatible bug fix.

While the version is `0.MINOR.PATCH` (as it is today — see the root
`package.json`), the public API is considered unstable and incompatible
changes may land in `MINOR` releases, as SemVer itself allows for the
`0.x` series. The project moves to `1.0.0` once the API between the four
workspaces (backend routes consumed by frontend/bot/mobile via Eden) is
considered stable enough to guarantee compatibility across `MINOR`
releases.

Each relevant release (typically when closing out a set of changes on
`main`) gets a `vX.Y.Z` tag and a matching
[GitHub Release](../../releases) summarizing the changes. Every PR adds
its user-facing changes under `## [Unreleased]` in
[`CHANGELOG.md`](./CHANGELOG.md) ([Keep a Changelog](https://keepachangelog.com/en/1.1.0/)).

## Code

Follow the conventions already documented in [`CLAUDE.md`](./CLAUDE.md):
Biome (tabs, 120-column lines), domain-based modules in the backend
(`*.routes.ts` → `*.service.ts` → `*.repository.ts`), tests next to the
file they test, English everywhere (code, comments, docs, commit
messages), and the manual sync points between workspaces (transaction
categories, better-auth error maps, password rules).

## Before opening a Pull Request

Run what the `pre-push` hook runs:

```bash
(cd backend && bunx --bun tsc --noEmit && bun run test:setup && bun run test && bun run build)
(cd frontend && bunx --bun tsc --noEmit && bun run build)
```

And, if your change touched `frontend/e2e/`, `frontend/playwright.config.ts`
or routes the E2E suite covers, also run the end-to-end tests:

```bash
cd frontend && bunx playwright test
```

A PR is only considered ready for review once all of the above pass — the
`pre-push` hook (and CI, in `.github/workflows/ci.yml`) block the
opposite.

## Reporting bugs and proposing features

Use GitHub [issues](../../issues). For bugs, include steps to reproduce,
expected vs. observed behavior, and (when relevant) which workspace is
affected (`backend`, `frontend`, `bot`, `mobile`). For features, describe
the problem the feature solves before the proposed solution — it helps
discuss alternatives before any code gets written.

## Secrets and environment variables

Never commit a real `.env` file (only `.env.example`/`.env.test`, always
with placeholder values, never real keys). If you suspect a real secret
leaked into a commit, flag it immediately instead of trying to fix it
yourself by rewriting history — shared history (`main`/`dev` already
pushed) is only rewritten deliberately, in agreement with whoever
maintains the project.
