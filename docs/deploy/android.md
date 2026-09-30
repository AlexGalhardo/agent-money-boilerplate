# Mobile builds (Android)

The Expo app (`mobile/`) uses the same API as the web app and bot. Builds
run on [EAS Build](https://docs.expo.dev/build/introduction/) (Expo's cloud
builders — a **paid/quota-limited** service), configured in `mobile/eas.json`:

| Profile       | Output     | Use                           |
| ------------- | ---------- | ----------------------------- |
| `development` | dev client | Local development builds      |
| `preview`     | `.apk`     | Sideload on your own phone    |
| `production`  | `.aab`     | Google Play (required format) |

CI builds automatically (`.github/workflows/mobile-build.yml`, needs the
`EXPO_TOKEN` secret): a push to `dev` queues a `preview` build, a push to
`main` a `production` build. Store submission stays manual on purpose.

## Prerequisites

- Bun ≥ 1.4 and an [Expo](https://expo.dev) account — `bunx eas-cli@24.7.0 login` in `mobile/`.
- `mobile/.env` (copy `mobile/.env.example`) with `EXPO_PUBLIC_API_URL`
  pointing at an API reachable from the phone / Expo's cloud — never `localhost`.

`eas-cli` is pinned (`24.7.0`, also in `eas.json` → `cli.version`) instead
of `@latest`; bump both together.

## Sideload an APK

```bash
./setups/deploy-android-apk.sh           # cloud build (preview profile)
./setups/deploy-android-apk.sh --local   # local build (needs Android SDK + JDK)
```

Download the `.apk` from the printed link (or expo.dev → Builds), copy it to
the phone and open it; Android asks to allow installs from that source.

## Publish on Google Play

One-time setup:

1. A [Google Play developer account](https://play.google.com/console) (USD 25 once).
2. The app created in the Play Console with its store listing and a
   **published privacy policy** (required before any build is accepted).
3. **Setup → API access**: link a Google Cloud project, create a Service
   Account with the _Release manager_ role, download its JSON key to
   `mobile/google-play-service-account.json` — **never commit it**
   (gitignored).

Then:

```bash
./setups/deploy-android-play-store.sh            # build the .aab
./setups/deploy-android-play-store.sh --submit   # build and submit to the internal testing track
```

`production` has `autoIncrement` on, so `versionCode` bumps itself.
Promoting from internal testing to production happens in the Play Console.

## App identity

`mobile/app.json` sets the `money://` scheme (deep links for Google login
and password reset), `android.package` and `ios.bundleIdentifier`
(`com.elysiagalhardofinances.money`). Changing the package or bundle id
after the first store release breaks the app's identity — treat them as
permanent.

## Testing before a build

- `bun run typecheck:mobile`, `bun run mobile:test` (Jest)
- `cd mobile && bun run test:e2e:web` (Playwright on the Expo web build)
- Maestro flows on an emulator/device — [`mobile/maestro/README.md`](../../mobile/maestro/README.md)
