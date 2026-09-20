# Code conventions

## General

- **No obvious comments.** Only comment the *why* when it's not obvious
  from the code itself (a hidden constraint, a workaround, an invariant).
  The existing codebase follows this closely — keep the pattern.
- **Tabs, not spaces.** Formatting is Biome's job (`bun run format`), not
  the editor's.
- **English only.** Code, identifiers, comments, docs, commit messages —
  everything. If you find Portuguese in this app's context (a holdover
  from before the 2026-09-20 rename), translate it to English as you
  touch that file.
- **Domain-based modules** in `backend/src/modules/<domain>/`, always
  following `*.routes.ts` (Elysia + inline Zod validation) →
  `*.service.ts` (business logic, testable in isolation) →
  `*.repository.ts` (the only layer that touches Prisma). See
  `backend/src/modules/transactions/` as the reference.
- **Tests live next to the file they test**: `foo.service.ts` and
  `foo.service.unit.test.ts` in the same directory, never in `__tests__/`.

## The four manual sync points

Some things are intentionally duplicated across workspaces rather than
shared, so that `bot` and `mobile` don't have to depend on the frontend's
React/TanStack workspace just for a string map. Keep all four in sync
when you touch any one of them.

1. **Transaction categories** are a fixed enum
   (`transactionCategories` in
   `backend/src/modules/transactions/transaction.schema.ts`), not a
   database table. Adding a category means editing that list **and**
   `categoryLabels` in `frontend/src/lib/categories.ts` **and**
   `bot/src/formatting/format.ts` **and** `mobile/src/lib/categories.ts`
   (and reviewing the frontend's color palettes — see the dataviz
   references in `frontend/`).
2. **better-auth errors never reach the screen/chat in English.**
   `error.message` from better-auth is always English and unstable
   across versions — always translate via `error.code` through a local
   map: `frontend/src/lib/auth-errors.ts` (`translateAuthError(error,
   fallback)`), `bot/src/lib/auth-errors.ts`, `mobile/src/lib/auth-errors.ts`.
3. **Password rules** (8-32 characters + complexity) are duplicated in
   `frontend/src/components/password-strength-input.tsx`,
   `bot/src/lib/password-rules.ts` and `mobile/src/lib/password-rules.ts`.

## Google login inside the Telegram bot

Not possible without leaving the chat (OAuth needs a browser). The flow:
`bot/src/lib/auth-flows.ts` generates a single-use token
(`backend/src/modules/telegram/telegram.service.ts`, the
`TelegramLinkToken` model, expires in 15min) and sends a link to
`frontend/src/routes/telegram-vincular.tsx`; that page, already
authenticated, calls `POST /telegram/link`
(`backend/src/modules/telegram/telegram.routes.ts`) to link the chat to
the account. The bot only learns it worked when the user taps "verify
link" (a manual poll — there's no push from the backend to the bot).

## Per-transaction password confirmation in the bot

Optional, controlled by the `TELEGRAM_BOT_USE_PASSWORD_TO_CONFIRM_ACTIONS`
env var (`bot/.env`, defaults to `false`). When `true`,
`requirePassword` (`bot/src/lib/verify-password-step.ts`) asks for the
personal password (`BOT_PASSWORD_HASH_BASE64`) before expense, income,
summary, search, delete and report actions. "Switch account" (main menu)
never goes through this flow — it only shows a Yes/No confirmation.
