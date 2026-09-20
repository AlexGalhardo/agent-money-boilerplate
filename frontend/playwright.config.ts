import { defineConfig, devices } from "@playwright/test";

const FRONTEND_URL = "http://localhost:4201";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: "list",
	use: {
		baseURL: FRONTEND_URL,
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: [
		{
			command: "bun run test:e2e:setup && bun run start:e2e",
			cwd: "../backend",
			url: "http://localhost:4200/",
			reuseExistingServer: !process.env.CI,
			timeout: 60_000,
		},
		{
			command: "vite dev --port 4201 --mode e2e",
			url: FRONTEND_URL,
			reuseExistingServer: !process.env.CI,
			timeout: 60_000,
		},
	],
});
