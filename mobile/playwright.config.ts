import { defineConfig, devices } from "@playwright/test";

// Drives the Expo app rendered by react-native-web — same screens, queries
// and navigation as native. Native-only behavior (Alert confirmations,
// secure storage, deep links) is covered by the Maestro flows in maestro/.
const API_URL = "http://localhost:4210";
const APP_URL = "http://localhost:4301";

export default defineConfig({
	testDir: "./e2e-web",
	fullyParallel: false,
	workers: 1,
	retries: process.env.CI ? 1 : 0,
	reporter: "list",
	use: { ...devices["Pixel 7"], baseURL: APP_URL, trace: "on-first-retry" },
	webServer: [
		{
			// `env` instead of `VAR=x cmd`: Playwright runs this through cmd.exe
			// on Windows. Process env takes precedence over --env-file.
			command: "bun run test:e2e:setup && bun --env-file=.env.e2e run src/server.ts",
			cwd: "../backend",
			env: { FRONTEND_URL: APP_URL, PORT: "4210" },
			url: `${API_URL}/`,
			reuseExistingServer: !process.env.CI,
			timeout: 90_000,
		},
		{
			command:
				"npx expo export --platform web --output-dir dist-e2e --clear && bun scripts/serve-web-export.ts dist-e2e 4301",
			// --clear: EXPO_PUBLIC_* values are inlined at transform time, so a
			// cached transform from another API URL would silently be reused.
			env: { EXPO_PUBLIC_API_URL: API_URL },
			url: APP_URL,
			reuseExistingServer: !process.env.CI,
			timeout: 240_000,
		},
	],
});
