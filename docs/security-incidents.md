# Security incidents

A short record of past incidents in this repository and the guardrails
that came out of them — so nobody re-introduces the same mistake and so
the reasoning behind certain `.gitignore`/hook rules doesn't get lost.

## 2026-09-19 — ~93MB compiled binary committed to history

A compiled `backend/server.exe` binary (`bun build --compile` output, not
gitignored at the time) was committed by accident, more than once, across
~19 commits already pushed to `origin/main` (then `master`) — plus two
abandoned branches nobody had cleaned up. Fixed with `git filter-repo`
and a force-push, and the whole branching model was rewritten around it.
**Guardrails**: `.gitignore` blocks `*.exe`; the `pre-commit` hook
(`.husky/pre-commit`) hard-blocks any staged `.exe`; the
`git-branch-workflow` skill (`.agents/skills/git-branch-workflow/SKILL.md`)
exists specifically so work happens on a disposable `dev` branch first.

## 2026-09-20 — real secrets committed to `.env.example` and deploy docs

`backend/.env.example`, `bot/.env.example` and `docs/deploy-railway.md`
had **real, working secrets** committed instead of placeholders:
`BETTER_AUTH_SECRET`, `ENCRYPTION_KEY` (the AES-256-GCM key that encrypts
every user's transactions), a real Google OAuth `GOOGLE_CLIENT_SECRET`, a
real `RESEND_API_KEY`, and a real, live `TELEGRAM_BOT_TOKEN` plus a bcrypt
hash of the bot's personal confirmation password. Found by scanning the
full git history before preparing the repo for open source. The files
were cleaned (placeholders now), but the old values remain reachable in
older commits — full history was not rewritten a second time, so **those
specific credentials must be treated as permanently compromised and
rotated** if this repo is ever made public.
**Guardrails**: `CONTRIBUTING.md`'s "Secrets and environment variables"
section and the `open-source-guidelines-pre-push` skill
(`.agents/skills/open-source-guidelines-pre-push/SKILL.md`) both call out
diffing staged `.env.example`/docs changes for real-looking values before
every push.

## 2026-09-20 — real bank statement (`paa.csv`) committed and tracked

`paa.csv`, a real Nubank statement export with third-party names and
partial document numbers (from the dashboard's "Import" feature), was
tracked at `HEAD`. Unlike the incident above, this one **was** removed
from the full commit history (the entire history was rewritten down to
10 milestone commits the same day, for unrelated reasons — see the
`open-source-guidelines-pre-push` skill and `CONTRIBUTING.md` for when
history rewrites are and aren't appropriate) — `paa.csv` never appears in
any of those 10 commits.
**Guardrails**: `.gitignore` now blocks `*.csv` repo-wide (no `.csv` is
intentionally tracked anywhere in this project).
