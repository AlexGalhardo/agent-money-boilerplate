import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/client/client";
import { env } from "./env";

// Prisma 7 exige um driver adapter explicito por conexao; o provider
// ativo tem que casar com o schema usado no ultimo `prisma generate`
// (ver prisma7.config.ts e package.json > scripts db:generate:*).
// SQLite usa libSQL (não better-sqlite3): o driver nativo do
// better-sqlite3 não roda sob o runtime do Bun (ERR_DLOPEN_FAILED).
const adapter =
	env.DATABASE_PROVIDER === "postgresql"
		? new PrismaPg({ connectionString: env.DATABASE_URL })
		: new PrismaLibSql({ url: env.DATABASE_URL });

export const prisma = new PrismaClient({
	adapter,
	errorFormat: "minimal",
});
