---
name: agent-money-mobile-ui
description: >
  Build or change a screen or component in the Agent Money Expo app
  (mobile/) and review it visually without a device. Use for any mobile UI,
  styling, navigation or design-system work.
---

# Mobile UI work (Agent Money)

1. Follow `docs/design-system.md`: dark-only, tokens in
   `mobile/tailwind.config.js`, NativeWind primitives (Button, TextField,
   Chip, DateField, Card, Screen). No new UI library, no `dark:` variants,
   no hardcoded colors.
2. Keep every `testID` / `accessibilityLabel` listed in the design system —
   the Maestro flows (`mobile/maestro/`) and the web E2E depend on them.
   New screen → add a stable `testID` and a flow step.
3. Verify:
   - `bun run typecheck:mobile && bun run mobile:test`
   - native bundle compiles:
     `cd mobile && EXPO_PUBLIC_API_URL=http://localhost:4200 npx expo export --platform android --clear`
   - `cd mobile && bun run test:e2e:web`
4. Visual review: from `mobile/`, serve `dist-e2e/` with
   `bun scripts/serve-web-export.ts dist-e2e 4301` and screenshot with
   Playwright at 390×844. Check hierarchy, spacing, empty/loading states.
5. Native-only behavior (alerts, secure storage, deep links): run
   `bun run qa` (Android group, emulator) or the Maestro flows — see
   `mobile/maestro/README.md`.

Expo-specific questions: `.claude/skills/expo-overview` routes to the right
Expo skill.
