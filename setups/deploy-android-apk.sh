#!/usr/bin/env bash
# Builds an .apk you install straight on the phone (sideload) via EAS Build —
# the "preview" profile in mobile/eas.json (buildType "apk", distribution
# "internal", no Play Store). Typical use: test on your own device before
# publishing for real — see deploy-android-play-store.sh for the Play Store
# flow (which requires an .aab, not an .apk).
#
# Prerequisites:
#   - Expo account (https://expo.dev) — `eas login` the first time.
#   - mobile/.env with EXPO_PUBLIC_API_URL pointing at an API the phone can
#     reach (not localhost — see mobile/.env.example).
#
# Usage:
#   ./setups/deploy-android-apk.sh            # build on Expo's cloud (EAS), no local Android SDK needed
#   ./setups/deploy-android-apk.sh --local    # local build (needs Android SDK + JDK installed)

set -e
cd "$(dirname "$0")/../mobile"

if ! command -v bun >/dev/null 2>&1; then
	echo "Bun not found. Install it from https://bun.sh before continuing." >&2
	exit 1
fi

echo "==> Installing dependencies (bun install)"
bun install

if [ ! -f .env ]; then
	echo "mobile/.env not found. Copy mobile/.env.example to mobile/.env and set EXPO_PUBLIC_API_URL before continuing." >&2
	exit 1
fi

# Pinned version (not "@latest"): Expo recommends not making eas-cli a
# devDependency (see mobile/eas.json "cli.version" and mobile/package.json),
# but "@latest" through bunx would fetch a new, unverified version on every
# run — so it's pinned here like any other dependency. Bump it together with
# "cli.version".
echo "==> Checking Expo login (eas whoami)"
if ! bunx eas-cli@24.7.0 whoami >/dev/null 2>&1; then
	echo "You are not logged in to Expo. Run 'bunx eas-cli@24.7.0 login' and try again." >&2
	exit 1
fi

if [ "$1" = "--local" ]; then
	echo "==> LOCAL APK build (preview profile) — needs Android SDK + JDK installed"
	bunx eas-cli@24.7.0 build --platform android --profile preview --local
else
	echo "==> Cloud APK build (preview profile)"
	bunx eas-cli@24.7.0 build --platform android --profile preview
fi

echo ""
echo "Build finished. Download the .apk from the link printed above (or at https://expo.dev,"
echo "your project's Builds tab) and move it to the phone (USB, e-mail, Drive, etc.)."
echo "On the device: Settings > Security > allow installing apps from unknown sources"
echo "(only for the app used to transfer the file), then open the .apk."
