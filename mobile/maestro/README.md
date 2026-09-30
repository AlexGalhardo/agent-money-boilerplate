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

Run the flows against a **release** build: a debug build always loads a dev
bundle, and its LogBox warning toasts float over the bottom bar and swallow
taps.

1. Install the CLI: `curl -Ls "https://get.maestro.mobile.dev" | bash`
   (Windows: unzip `maestro.zip` from the
   [releases](https://github.com/mobile-dev-inc/maestro/releases); it needs Java 17+).
2. Start the E2E API (from `backend/`):
   `bun run test:e2e:setup && PORT=4210 bun --env-file=.env.e2e run src/server.ts`.
3. Build and install a release APK that talks to it (from `mobile/`, with
   JDK 17 — JDK 24+ fails the CMake configure step):

   ```bash
   bunx expo prebuild --platform android --no-install
   # android/ is generated and gitignored: allow http to the local API
   sed -i 's|<application |<application android:usesCleartextTraffic="true" |' android/app/src/main/AndroidManifest.xml
   cd android && EXPO_PUBLIC_API_URL=http://localhost:4210 ./gradlew assembleRelease -PreactNativeArchitectures=x86_64
   adb install -r app/build/outputs/apk/release/app-release.apk
   adb reverse tcp:4210 tcp:4210
   ```

   `expo prebuild` rewrites the `android`/`ios` scripts in `package.json` —
   revert that. On Windows, build from a short path (`subst R: <repo>`, then
   Gradle from `R:\mobile\android`): the release CMake paths exceed 260 chars.

4. From `mobile/`:

   ```bash
   maestro test maestro/                           # both flows
   maestro test maestro/transaction-crud.yaml      # one flow
   ```

   Reseed (`bun run test:e2e:setup`) before rerunning a failed run — it
   leaves its transaction behind.

Flows:

- `auth-signup-login-logout.yaml` — signs up a random account, lands on the
  dashboard, logs out through "Minha Conta" and the native confirmation.
- `transaction-crud.yaml` — logs in as the demo account and runs create →
  search → edit → delete for one transaction.

Selectors (keep them stable — see `docs/design-system.md` → "Testing hooks"):
inputs by `id: field-<label>`, bottom-bar buttons by `id: nav-*`, the
search input by `id: search-input`, everything else by visible text.

Status: both flows pass on an Android emulator (release build, 2026-09-30).
