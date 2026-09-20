# E2E flows (Maestro)

Two flows covering what the app can't ship broken: authentication and the
transaction CRUD loop.

- `auth-signup-login-logout.yaml` — signs up a new account (random e-mail,
  so it's repeatable), confirms it lands on the dashboard, logs out from
  Minha Conta, and checks it's back on the login screen.
- `transaction-crud.yaml` — logs in as the seeded demo account
  (`admin@gmail.com` / `adminBR@123`, see `backend/prisma/seed.ts` — same
  credentials the web and bot E2E suites use), creates an expense via the
  "+" button, finds it through the search screen, edits its amount, then
  deletes it.

[Maestro](https://maestro.mobile.dev) was picked over Detox on purpose: it
drives the app as a black box over the platform's accessibility tree (no
native rebuild, no linking step), which is what actually fits a CI runner
or a contributor's machine without an Xcode/Android Studio project already
configured.

## Running locally

1. Install the CLI once: `curl -Ls "https://get.maestro.mobile.dev" | bash`
   (see the [install guide](https://docs.maestro.dev/getting-started/installing-maestro)
   for Windows/other options).
2. Have the app running on a simulator/emulator or a connected device,
   built against a backend that has run `bun run db:seed` (the CRUD flow
   needs the seeded admin account to exist).
3. From `mobile/`:

   ```bash
   maestro test maestro/auth-signup-login-logout.yaml
   maestro test maestro/transaction-crud.yaml
   # or both at once:
   maestro test maestro/
   ```

## Why these weren't run in this session

Maestro drives a real simulator/emulator or device — there wasn't one
available in the environment these flows were written in, so unlike the
rest of this project's test suites, these have **not** been executed
end-to-end yet. Selectors were written by reading the exact `label`/
`testID`/`accessibilityLabel` values in the corresponding screens
(`src/app/(auth)/login.tsx`, `signup.tsx`, `src/app/(app)/profile.tsx`,
`src/components/ui/bottom-nav.tsx`, `src/app/(app)/transaction/[id].tsx`)
rather than guessed, but they should still be run once against a real
device/emulator before relying on them in CI.
