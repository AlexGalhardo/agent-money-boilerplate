/** @type {import('jest').Config} */
module.exports = {
	preset: "jest-expo",
	setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
	testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
		"^@op/shared$": "<rootDir>/../shared/src/index.ts",
		"^@op/shared/(.*)$": "<rootDir>/../shared/src/$1.ts",
	},
	collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.test.{ts,tsx}", "!src/app/**"],
};
