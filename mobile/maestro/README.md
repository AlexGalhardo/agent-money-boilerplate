# Mobile E2E

The mobile app has two E2E layers. Both drive real screens against the real
backend (seeded E2E database, demo account `admin@gmail.com` / `adminBR@123`
from `backend/prisma/seed.ts`).

| Layer                       | Where                   | Runs on                                   | Covers                                                                                                              |
| --------------------------- | ----------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Playwright (Expo web build) | `mobile/e2e-web/`       | Any machine / CI — no emulator            | Sign-up, login errors, create → search → edit transaction, filters, profile                                         |
| Maestro (native)            | `mobile/maestro/*.yaml` | Android emulator, iOS simulator or device | Everything above **plus** native-only behavior: `Alert` confirmations (log out, delete), secure storage, deep links |

## Playwright on the web build

```bash
cd mobile
bun run test:e2e:web
```

The config (`mobile/playwright.config.ts`) resets and seeds the E2E database,
starts the API on `:4210`, exports the app for web with
`EXPO_PUBLIC_API_URL=http://localhost:4210` and serves it on `:4301`.
`Alert.alert` is a no-op on web, so confirm-dialog steps are covered by
Maestro instead.

## Maestro on a device

1. Install the CLI: `curl -Ls "https://get.maestro.mobile.dev" | bash`
   (Windows: see the [install guide](https://docs.maestro.dev/getting-started/installing-maestro); it needs Java 17+).
2. Start an emulator/simulator (Android Studio → Device Manager, or Xcode)
   and run a development build of the app against a backend that ran
   `bun run db:seed`.
3. From `mobile/`:

   ```bash
   maestro test maestro/                           # both flows
   maestro test maestro/transaction-crud.yaml      # one flow
   ```

Flows:

- `auth-signup-login-logout.yaml` — signs up a random account, lands on the
  dashboard, logs out through "Minha Conta" and the native confirmation.
- `transaction-crud.yaml` — logs in as the demo account and runs create →
  search → edit → delete for one transaction.

Selectors (keep them stable — see `docs/design-system.md` → "Testing hooks"):
inputs by `id: field-<label>`, bottom-bar buttons by `id: nav-*`, the
search input by `id: search-input`, everything else by visible text.

Status: the flows were rewritten for the 2026-09-27 redesign, but no
emulator was available in that environment, so they have **not** been
executed on a device yet — the Playwright suite exercised the same screens.
