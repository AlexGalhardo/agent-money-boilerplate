import { defineConfig, env } from "prisma/config";

// Unlike the Bun runtime, Prisma 7's config loader doesn't read .env on its
// own — without this, `prisma generate`/`migrate` fail with "Cannot resolve
// environment variable" even with a .env present.
try {
	process.loadEnvFile(".env");
} catch {
	// no .env (variables already come from the environment, e.g. containers)
}

// SQLite is the default for local development with no external services.
// DATABASE_PROVIDER=postgresql switches to the Postgres schema/migrations,
// used for full local dev and production.
const provider = process.env.DATABASE_PROVIDER === "postgresql" ? "postgresql" : "sqlite";

export default defineConfig({
	schema: `prisma/schema.${provider}.prisma`,
	migrations: {
		path: `prisma/migrations-${provider}`,
	},
	datasource: {
		url: env("DATABASE_URL"),
	},
});
