import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/client/client";
import { env } from "./env";

// Prisma 7 requires an explicit driver adapter per connection; the active
// provider must match the schema used by the last `prisma generate` (see
// prisma7.config.ts and the db:generate:* scripts). SQLite goes through
// libSQL, not better-sqlite3: better-sqlite3's native driver doesn't load
// under the Bun runtime (ERR_DLOPEN_FAILED).
const adapter =
	env.DATABASE_PROVIDER === "postgresql"
		? new PrismaPg({ connectionString: env.DATABASE_URL })
		: new PrismaLibSql({ url: env.DATABASE_URL });

export const prisma = new PrismaClient({
	adapter,
	errorFormat: "minimal",
});
