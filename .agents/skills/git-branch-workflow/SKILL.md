---
name: git-branch-workflow
description:
  Standing git branching convention for this repository — main-only default
  branch, a single "dev" working branch per task, verify-then-merge. Use
  whenever starting a new task/feature/fix, opening a PR, or deciding how to
  commit and push changes. Triggers on "new feature", "start a task", "commit
  this", "push this", "open a PR", "merge to main", or any git branch/commit
  decision in this repo.
license: MIT
metadata:
  author: aleexgvieira
  version: '1.0.0'
---

# Git branch workflow

This repository had ~93MB of a compiled `.exe` binary committed by accident,
more than once, across ~19 commits already pushed to `origin/main` (formerly
`master`) — plus two abandoned branches (`dev`, `worktree-todo-implementation`)
nobody had cleaned up. Fixing that required rewriting history with
`git filter-repo` and force-pushing. This skill exists so that never happens
again, and so every task follows the same small, predictable branch flow
instead of ad-hoc commits straight to the default branch.

## The rule

`main` is the **only** long-lived branch. There is no `master`, no permanent
`develop`. For every task (feature, fix, refactor — anything):

1. **Branch off `main`.** Create (or reuse, if still open) a branch named
   `dev`. Don't invent per-feature branch names unless the user explicitly
   asks for one — the convention here is one `dev` branch per unit of work.
2. **Do the work on `dev`.** Commit there as usual (see the repo's own
   CLAUDE.md/AGENTS.md for commit and code-comment conventions).
3. **Verify before pushing.** Run what `.husky/pre-push` runs — typecheck,
   test suite, build — for every workspace touched. Don't push `dev` (or
   merge it) with a red build.
4. **Push `dev`.** `git push -u origin dev` (or `git push` if already
   tracking). This is safe — `dev` is disposable, force-pushing it if you
   need to rewrite its own history is fine.
5. **Merge into `main` only after `dev` is green.** `git checkout main &&
   git merge dev`, then `git push origin main`. Never commit directly on
   `main`, and never force-push `main` — if `main` history ever needs
   rewriting (like the `.exe` purge that prompted this skill), that is a
   deliberate, explicitly-confirmed operation, not a routine one.
6. After merging, `dev` can be deleted or reset for the next task — don't
   let it pile up as a second permanent branch.

## Why this matters here specifically

- **A binary or lockfile mistake dies with `dev`, not with `main`.** If a
  build artifact gets committed by accident (it happened with
  `backend/server.exe` — see `.gitignore`'s `*.exe` rule and the
  `.husky/pre-commit` guard that now blocks it), catching it before the
  merge into `main` means never having to rewrite shared history again.
- **`main` staying green is the whole point.** Anyone (human or agent)
  pulling `main` should always get something that typechecks, tests, and
  builds — that guarantee only holds if nothing lands there without having
  passed through `dev` first.
- **One `dev` branch, not a pile of feature branches**, keeps this small
  repo's branch list legible — matches how this project is actually worked
  on (mostly solo, short-lived tasks), rather than importing a heavier
  multi-branch model it doesn't need.

## What NOT to do

- Don't commit directly on `main`.
- Don't force-push `main` without the user explicitly confirming it first —
  treat it exactly like any other hard-to-reverse, shared-history operation.
- Don't skip the verify step (typecheck/test/build) because a change "looks
  small" — that's exactly how the `.exe` binary got committed in the first
  place (a "fix" commit with no review of `git status` before `git add`).
- Don't leave old branches (feature branches, stale worktree branches)
  lingering on the remote once their work has landed on `main` — delete them
  (`git push origin --delete <branch>`) rather than letting them accumulate.
