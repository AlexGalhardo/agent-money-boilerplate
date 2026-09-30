---
name: agent-money-sync-points
description: >
  Change a value that is intentionally duplicated across Agent Money
  workspaces: transaction categories, better-auth error translations,
  password rules, plan rules (free transaction limit). Use when adding or
  renaming a category, changing password rules, translating an auth error,
  or changing plan limits.
---

# Change a sync point (Agent Money)

`bot` and `mobile` must not import from the frontend, so these values are
copied on purpose. Change every copy in one commit. Source of truth:
`docs/code-conventions.md#sync-points-intentional-duplication`.

1. **Transaction categories** — start at `transactionCategories` in
   `backend/src/modules/transactions/transaction.schema.ts`, then labels in
   `frontend/src/lib/categories.ts`, `bot/src/formatting/format.ts`,
   `mobile/src/lib/categories.ts`, the web/mobile `category-icons`, and the
   chart palettes. Grep an existing category key to find every spot:
   `rg -n "<existing-key>" backend/src frontend/src bot/src mobile/src`.
   Renaming/removing a key breaks stored rows — it needs a Prisma data
   migration in `backend/prisma/`.
2. **better-auth error translations** — `frontend/src/lib/auth-errors.ts`,
   `bot/src/lib/auth-errors.ts`, `mobile/src/lib/auth-errors.ts`. Translate
   by `error.code`; never show `error.message`.
3. **Password rules** — `frontend/src/components/password-strength-input.tsx`,
   `bot/src/lib/password-rules.ts`, `mobile/src/lib/password-rules.ts`.
4. **Plan rules** (`FREE_TRANSACTION_LIMIT`, `hasActivePlan`) —
   `backend/src/lib/plan.ts` (enforced), `frontend/src/lib/plan.ts`,
   `mobile/src/lib/plan.ts` (display only).

Verify: `bun run typecheck` and the unit tests of every workspace touched
(`agent-money-verify`). User-facing strings stay pt-BR; code stays English.
