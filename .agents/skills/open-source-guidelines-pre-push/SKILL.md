---
name: open-source-guidelines-pre-push
description:
  Checklist every AI agent (and human) must follow before pushing to
  dev/main in this repository, now that the project follows open source
  practice (Conventional Commits, SemVer, LICENSE, CONTRIBUTING). Always
  use before `git push`, before opening a Pull Request, or before marking
  a task done. Triggers on "push this", "open a PR", "ready to merge",
  "ready to push", "before pushing", "finish the task".
license: MIT
metadata:
  author: aleexgvieira
  version: "1.0.0"
---

# Open source guidelines — before pushing

This repository is (or is on its way to being) open source. That changes
what "done" means: beyond working, every change needs to be something an
outside contributor, reading the history cold, can understand and trust.
This checklist runs **before every `git push`** to `dev` or `main` — not
just at the end of large tasks.

This skill assumes you already follow
[`.agents/skills/git-branch-workflow/SKILL.md`](../git-branch-workflow/SKILL.md)
(a single `dev` branch, never committing directly to `main`). What
follows is additional to that, specific to keeping the project healthy
as an open source repo.

## Checklist before `git push`

1. **Commit message follows Conventional Commits.** The
   `.husky/commit-msg` hook blocks the commit automatically if it
   doesn't — but don't rely on the hook alone: write the right message
   the first time (see `CONTRIBUTING.md` for valid types and examples).
   If the change breaks compatibility, use `!` after the type
   (`feat(api)!: ...`) or a `BREAKING CHANGE: ...` footer.
2. **No real secret in any staged file.** Before `git add`, run
   `git diff --cached` (or `git status` + a manual file review) and look
   for: API keys, tokens, passwords, real bcrypt hashes, connection
   strings with embedded credentials. `.env.example`, `.env.test`,
   `.env.e2e` files must contain **only placeholders** (e.g.
   `<generate-with-openssl-rand-hex-32>`), never a value that ever
   actually worked — this has already happened in this repository (see
   [`docs/security.md`](../../../docs/security.md)).
   If you find a real secret staged or already committed, stop and flag
   it to whoever maintains the project — don't try to rewrite shared
   history yourself (see `git-branch-workflow/SKILL.md`, "What NOT to
   do"); the fix is rotating the credential, not just deleting the text.
3. **`.editorconfig` and Biome weren't violated.** `bun run format &&
   bun run lint` (the `pre-commit` hook already runs this) — consistent
   indentation, charset and line width are part of what makes an open
   source project easy to review.
4. **`LICENSE` and `CONTRIBUTING.md` are still correct** if the change
   affects how the project is licensed, contributed to, or versioned.
   Don't edit `LICENSE` without explicit confirmation — it's a legal
   change, not a technical one.
5. **`CLAUDE.md`/`AGENTS.md` updated** if the change introduced a new
   convention, command, structural dependency or architecture change
   (see the global `CLAUDE.md`'s "Documentation and changelog" section).
   Add the change under `## [Unreleased]` in the root `CHANGELOG.md`.
6. **Tests and build pass locally** — what the `pre-push` hook runs:

   ```bash
   (cd backend && bunx --bun tsc --noEmit && bun run test:setup && bun run test && bun run build)
   (cd frontend && bunx --bun tsc --noEmit && bun run build)
   ```

   And the E2E tests (`cd frontend && bunx playwright test`) if the
   change touched routes, forms or flows that `frontend/e2e/` covers.
7. **New dependencies use an exact stable version**, never
   `latest`/`next`/`canary`/`alpha`/`beta`/pre-release tags, and the
   lockfile was regenerated with `npx bun@1.3.14 install` (not the
   global bun) — see the global `CLAUDE.md`'s "Dependencies" section and
   [`docs/architecture.md`](../../../docs/architecture.md)'s `bun.lock` note.

## Before merging `dev` → `main`

On top of the checklist above (which already applies to every commit on
`dev`):

8. **Consider whether the change deserves a release.** If the set of
   commits going to `main` represents a unit of value for the end user
   (a new feature, a relevant fix, a behavior change), create a
   `vX.Y.Z` tag (following SemVer — see `CONTRIBUTING.md`) and a
   [GitHub Release](../../../../../releases) summarizing the changes,
   after the merge to `main` is pushed. Not every merge needs a release
   — purely internal changes (`chore`, `refactor` with no observable
   effect) usually don't.
9. **Never force-push `main`.** If something went wrong after the merge,
   fix it with a new commit (`revert:` or `fix:`), not by rewriting what
   was already pushed — same rule as `git-branch-workflow`, reinforced
   here because rewritten history on a public repository breaks any
   existing fork, clone or third-party PR.
