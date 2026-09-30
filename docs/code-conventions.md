# Code conventions

## Language

- **English** for code, identifiers, comments, docs, commit messages and
  developer-facing strings (logs, env validation errors, dev scripts).
- **Portuguese (pt-BR)** only for text end users read: UI copy, API error
  messages shown in the apps, bot messages, e-mails, and the OpenAPI
  `summary`/`description` rendered on the `/api` page.
- Found Portuguese in code or comments? Translate it when you touch the file.

## Style

- Tabs, width 4 (`.editorconfig`); Markdown/YAML use 2 spaces. Biome formats
  TS/JS/JSON/CSS, Prettier formats Markdown — never hand-format.
- **No obvious comments.** Comment the _why_: a hidden constraint, a
  workaround (with the upstream issue when there is one), an invariant, a
  security decision.
- Strict TypeScript: no `any` (use `unknown` + narrowing), explicit return
  types on exported functions, no `@ts-ignore`/`@ts-expect-error` without a
  reason next to it, no casts that hide a runtime mismatch (the Eden `Date`
  bug hid behind `as Transaction[]`).
- New dependencies: exact stable versions (no `^`, no `latest`/`next`/
  pre-release), installed with `npx bun@1.3.14 add --exact <pkg>@<version>`.

## Backend

- Domain modules follow `schema → routes → service → repository` (see
  [`architecture.md`](./architecture.md#backend-layering)); only
  repositories import `prisma`.
- Validate every input at the route with Zod (body, query, params) and give
  public routes a `response` schema and OpenAPI `detail`.
- Expected failures: throw an `AppError` subclass with the right status —
  never `try/catch` in a route just to map errors.
- Compare secrets with `secureCompare`; never log secrets, tokens or
  personal data.
- Anything that grants access (linking a Telegram chat, activating a plan)
  must be driven by a verified credential or a verified upstream state —
  never by an identifier the client supplies.

## Clients

- Web: data access through `frontend/src/lib/queries.ts` hooks; pure logic
  in `lib/` with `*.unit.test.ts`; route files compose components from
  `components/<area>/`.
- Mobile: tokens and components from [`design-system.md`](./design-system.md);
  data through `mobile/src/query/`; normalize API values at that boundary.
- Bot: conversations receive the authorized `userId` from
  `withAuthorizedUser`; results crossing `conversation.external()` must be
  plain serializable values (the plugin `structuredClone`s them, which
  strips Error subclasses).

## Tests

- Next to the code: `foo.ts` + `foo.unit.test.ts` (bun) or `foo.test.ts`
  (mobile Jest). Backend integration tests: `src/server.integration.test.ts`.
- Every bug fix and security fix gets a regression test that fails without
  the fix.
- E2E selectors: labels, roles, and the stable testIDs listed in
  [`design-system.md`](./design-system.md#testing-hooks-dont-break-these).

## Sync points (intentional duplication)

`bot` and `mobile` must not depend on the frontend workspace for a string
map, so these are duplicated — change them together:

1. **Transaction categories** — `transactionCategories` in
   `backend/src/modules/transactions/transaction.schema.ts`, labels in
   `frontend/src/lib/categories.ts`, `bot/src/formatting/format.ts`,
   `mobile/src/lib/categories.ts` (plus icons in the web/mobile
   `category-icons` and the chart palettes).
2. **better-auth error translations** — `frontend/src/lib/auth-errors.ts`,
   `bot/src/lib/auth-errors.ts`, `mobile/src/lib/auth-errors.ts` (always
   translate by `error.code`, never show `error.message`).
3. **Password rules** (8–32 chars + complexity) —
   `frontend/src/components/password-strength-input.tsx`,
   `bot/src/lib/password-rules.ts`, `mobile/src/lib/password-rules.ts`.
4. **Plan rules** (`FREE_TRANSACTION_LIMIT`, `hasActivePlan`) —
   `backend/src/lib/plan.ts`, `frontend/src/lib/plan.ts`, `mobile/src/lib/plan.ts`.

The `agent-money-sync-points` skill walks through a change to any of them.
