# 0009. Desktop app: an Electron shell around the web dashboard

- Status: Accepted
- Date: 2026-09-29

## Context

A desktop app for Windows, Linux and macOS was requested as a fifth workspace. The web dashboard already covers every feature, and its server proxies the API on its own origin so the session cookie works (`frontend/proxy-paths.ts`). Bundling a second UI (for example the Expo web export) would duplicate screens and need a new CORS/`trustedOrigins` entry for an `app://` origin.

## Decision

`desktop-electronjs/` is a sandboxed Electron window that loads the web dashboard URL (`--url`, `DESKTOP_APP_URL`, or `package.json` `appUrl`, which the release workflow sets to production). The renderer has no Node.js, no preload and no IPC; navigation to other origins and `window.open` go to the system browser; every permission except clipboard writes is denied; a data: page with auto-retry replaces a failed load. electron-builder packages NSIS (Windows), AppImage (Linux) and an ad hoc signed `.app` zip (macOS).

## Consequences

No duplicated UI or API client, and web releases reach the desktop app without reinstalling. The app needs the web server reachable (no offline mode). Google OAuth leaves the window (it opens in the browser), so the desktop app signs in with e-mail/password. Installers are unsigned until code-signing certificates exist (SmartScreen warning, Gatekeeper "unidentified developer").
