# E2E (Maestro)

Two flows:

| Flow | Mode | Needs a backend? | What it proves |
|---|---|---|---|
| `smoke.yaml` | `EXPO_PUBLIC_DATA_MODE=local` | No | signup → create transaction → balance updates → profile → logout |
| `flow.yaml` | `EXPO_PUBLIC_DATA_MODE=remote` | Yes (sandbox) | signup → login → 2FA screen → offline transaction → reconnect + sync → PIX checkout → premium unlocked |

## Prerequisites

- [Maestro](https://maestro.mobile.dev) installed (`curl -Ls https://get.maestro.mobile.dev | bash`)
- An Android emulator or iOS simulator running, with a **dev/preview build** of
  the app installed (Expo Go can't read `EXPO_PUBLIC_*` overrides reliably —
  build with `eas build --profile preview` or run `expo run:android`).
- `appId` in the YAML files is `com.op.app`; change it to match
  `mobile/app.json` → `android.package` / `ios.bundleIdentifier` once those are
  set for your build.

## Running the smoke flow (no backend)

```bash
cd mobile
EXPO_PUBLIC_DATA_MODE=local npx expo run:android   # or run:ios
cd ..
maestro test e2e/smoke.yaml
```

## Running the full flow (backend + sandbox)

1. Start the backend in a terminal with sandbox keys:
   ```bash
   cd backend
   # .env: STRIPE_SECRET_KEY=sk_test_..., STRIPE_WEBHOOK_SECRET from `stripe listen`,
   #       ABACATEPAY_API_KEY=<sandbox>, ABACATEPAY_WEBHOOK_SECRET=...,
   #       EMAIL_DRY_RUN=true
   bun run db:migrate && bun run dev
   ```
2. In another terminal, forward Stripe webhooks:
   ```bash
   stripe listen --forward-to localhost:3333/v1/webhooks/stripe
   ```
3. Build/run the app pointing at the backend (use your machine LAN IP for a
   physical device):
   ```bash
   cd mobile
   EXPO_PUBLIC_DATA_MODE=remote EXPO_PUBLIC_API_URL=http://10.0.2.2:3333 npx expo run:android
   ```
4. Run the flow:
   ```bash
   maestro test e2e/flow.yaml
   ```
5. When the flow pauses at the PIX step, confirm the sandbox payment:
   `POST https://api.abacatepay.com/v2/transparents/simulate-payment` with the
   `billingId`, or use the AbacatePay dashboard. The webhook then flips the
   subscription to `active` and the app shows **Acesso premium liberado**.

## Notes / manual checkpoints

- The 2FA enable step needs a TOTP code from an authenticator app; `flow.yaml`
  only opens the 2FA screen. Full automation requires a runner that can generate
  a code from the shown secret.
- `setAirplaneMode` requires Android; on iOS simulators toggle connectivity via
  the runner instead.
