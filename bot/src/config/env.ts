import { z } from "zod";

const boolFromString = z
	.enum(["true", "false"])
	.default("false")
	.transform((value) => value === "true");

// The bot imports `prisma`/`encrypt`/`decrypt` and services straight from
// `@agent-money-boilerplate/backend` (same database, same encryption), so the
// bot process must also satisfy the API's env schema (DATABASE_URL,
// BETTER_AUTH_SECRET, ENCRYPTION_KEY, ...) — `bot/.env.example` mirrors
// `backend/.env.example` plus the variables below.
const envSchema = z.object({
	TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
	// Stored as base64: a bcrypt hash contains literal "$" (e.g. "$2b$10$..."),
	// and both Bun's and Docker Compose's .env parsers try to expand "$" as a
	// variable reference, each with a different, incompatible escape syntax.
	// Base64 sidesteps both (see bot/scripts/hash-password.ts).
	BOT_PASSWORD_HASH_BASE64: z
		.string()
		.min(1, "BOT_PASSWORD_HASH_BASE64 is required (generate with `bun run hash-password`)"),
	BOT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
	BOT_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
	// Feature flag: ask for the personal password (verify-password-step.ts)
	// before every data action in the bot. Off by default.
	TELEGRAM_BOT_USE_PASSWORD_TO_CONFIRM_ACTIONS: boolFromString,
});

type RawBotEnv = z.infer<typeof envSchema>;
export type BotEnv = Omit<RawBotEnv, "BOT_PASSWORD_HASH_BASE64"> & { BOT_PASSWORD_HASH: string };

function loadEnv(): BotEnv {
	const raw = Object.fromEntries(
		Object.entries(Bun.env).map(([key, value]) => [key, value === "" ? undefined : value]),
	);
	const parsed = envSchema.safeParse(raw);

	if (!parsed.success) {
		console.error("Invalid bot environment variables:");
		console.error(z.treeifyError(parsed.error));
		throw new Error("Failed to load bot environment variables. Check bot/.env.");
	}

	const { BOT_PASSWORD_HASH_BASE64, ...rest } = parsed.data;
	return { ...rest, BOT_PASSWORD_HASH: Buffer.from(BOT_PASSWORD_HASH_BASE64, "base64").toString("utf8") };
}

export const env = loadEnv();
