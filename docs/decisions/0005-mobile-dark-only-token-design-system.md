# 0005. Mobile: dark-only UI on NativeWind tokens

- Status: Accepted
- Date: 2026-09-27

## Context

The mobile UI mixed hand-picked hex values, a light/dark toggle and ~2,300 lines of vendored reacticx components, and looked inconsistent.

## Decision

Dark-only. One palette (`mobile/src/theme/palette.js`) feeds NativeWind classes and raw style props; a small set of pure-NativeWind primitives replaces the vendored components; rules live in `docs/design-system.md`.

## Consequences

No theme toggle to maintain; screens can't introduce ad-hoc colors without it being visible drift. Native controls get `themeVariant="dark"`. Adding a light theme later means adding a second palette, not rewriting screens.
