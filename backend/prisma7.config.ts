import { defineConfig, env } from "prisma/config";

// Ao contrário do runtime do Bun, o carregador de config do Prisma 7 não
// lê o .env sozinho — sem isso, `prisma generate`/`migrate` falha com
// "Cannot resolve environment variable" mesmo com o .env presente.
try {
	process.loadEnvFile(".env");
} catch {
	// sem .env (ex.: variáveis já vêm do ambiente, como em containers)
}

// SQLite é o padrão para desenvolvimento local sem dependências externas
// (ver feature flags da spec). DATABASE_PROVIDER=postgresql troca para o
// schema/migrations de Postgres, usados em dev completo e produção.
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
