#!/usr/bin/env bash
# Google Play release: builds the .aab (Android App Bundle — the format the
# Play Store requires, unlike the sideload .apk from deploy-android-apk.sh)
# via EAS Build and, optionally, submits it to the "internal testing" track
# via EAS Submit.
#
# Prerequisites (one-time, manual):
#   1. Expo account (https://expo.dev) — `eas login`.
#   2. Google Play developer account (one-time USD 25 fee,
#      https://play.google.com/console) with the app already created there
#      (name, store listing, privacy policy — the Play Store requires a
#      published URL before it accepts any build).
#   3. A Google Cloud Service Account with the "Release manager" permission
#      linked to the Play Console (Settings > API access), its JSON key
#      saved at mobile/google-play-service-account.json (sensitive — NEVER
#      commit it; already covered by .gitignore).
#   4. mobile/.env with EXPO_PUBLIC_API_URL pointing at the production API.
#
# Usage:
#   ./setups/deploy-android-play-store.sh              # build the .aab only
#   ./setups/deploy-android-play-store.sh --submit      # build and submit ("internal" track, see mobile/eas.json)

set -e
cd "$(dirname "$0")/../mobile"

if ! command -v bun >/dev/null 2>&1; then
	echo "Bun not found. Install it from https://bun.sh before continuing." >&2
	exit 1
fi

echo "==> Installing dependencies (bun install)"
bun install

if [ ! -f .env ]; then
	echo "mobile/.env not found. Copy mobile/.env.example to mobile/.env and set EXPO_PUBLIC_API_URL (pointing at the production API) before continuing." >&2
	exit 1
fi

# Pinned version (not "@latest") — see deploy-android-apk.sh for why.
echo "==> Checking Expo login (eas whoami)"
if ! bunx eas-cli@24.7.0 whoami >/dev/null 2>&1; then
	echo "You are not logged in to Expo. Run 'bunx eas-cli@24.7.0 login' and try again." >&2
	exit 1
fi

echo "==> Production .aab build (production profile, versionCode autoIncrement on)"
bunx eas-cli@24.7.0 build --platform android --profile production --non-interactive

if [ "$1" = "--submit" ]; then
	if [ ! -f google-play-service-account.json ]; then
		echo "mobile/google-play-service-account.json not found — can't submit automatically." >&2
		echo "Download the Service Account key from the Google Cloud Console (see the comment at the top of this script) and save it at that path, or upload the .aab manually at https://play.google.com/console." >&2
		exit 1
	fi
	echo "==> Submitting the latest build to the Play Store 'internal' track"
	bunx eas-cli@24.7.0 submit --platform android --profile production --latest
	echo ""
	echo "Submitted. Follow processing at https://play.google.com/console — the"
	echo "'internal testing' track usually goes live in minutes; promoting to production is manual."
else
	echo ""
	echo ".aab build finished (link above, or at https://expo.dev). To publish:"
	echo "  ./setups/deploy-android-play-store.sh --submit"
	echo "or upload the .aab manually at https://play.google.com/console."
fi
