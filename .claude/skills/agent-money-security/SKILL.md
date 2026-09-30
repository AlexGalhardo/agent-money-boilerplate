---
name: agent-money-security
description: >
  Make or review a security-sensitive change in Agent Money: auth, Telegram
  linking, payments/PIX, webhooks, API keys, secrets, encryption, user input.
  Use when fixing a vulnerability, touching those areas, or when a secret
  shows up in the repo.
---

# Security-sensitive change (Agent Money)

1. Read `docs/security.md` first — the OWASP audit, the decisions already
   taken, and the incident log. Don't reopen a closed finding by accident
   (e.g. Telegram linking only through authenticated flows).
2. Follow `.claude/skills/security-and-hardening` and its checklist
   (`.claude/references/security-checklist.md`).
3. Write the abuse case as a failing test first (backend:
   `server.integration.test.ts` for HTTP, a service test for logic; bot:
   the handler test), then fix, then watch it pass.
4. Patterns already in the code — reuse them, don't reinvent:
   - errors: `AppError` subclasses with a status, one `onError` mapper;
   - input: Zod schemas at every boundary (routes, webhook bodies, bot input);
   - secrets: constant-time compare; AES-256-GCM for data at rest;
   - output: explicit DTOs, never the raw Prisma row;
   - Telegram messages: escape user-controlled text.
5. Record the finding (severity, fix, status) in `docs/security.md` and a
   `### Security` entry in `CHANGELOG.md`.
6. Run `bun run qa` — its pentest checks cover auth, IDOR and headers.

## A secret was committed or found

Never "fix" it with a new commit only — git history keeps it. Tell the
user: the secret must be **rotated** at its provider first, then removed.
Rewriting pushed history needs the user's explicit confirmation.
