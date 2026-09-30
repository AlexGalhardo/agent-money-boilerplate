# 0007. Mobile E2E: Playwright on the Expo web build + Maestro

- Status: Accepted
- Date: 2026-09-27

## Context

The Maestro flows needed an emulator and had never run; the development machine and CI runners have none.

## Decision

Run the same screens through react-native-web with Playwright (`mobile/e2e-web/`, in CI) against the real seeded API, and keep Maestro for native-only behavior (Alert confirmations, secure storage, deep links).

## Consequences

Most regressions are caught on every push without an emulator. Web-only differences: `Alert.alert` is a no-op and hidden stack screens stay in the DOM (locators are scoped to visible elements). Maestro still has to be run on a device before relying on native flows.
