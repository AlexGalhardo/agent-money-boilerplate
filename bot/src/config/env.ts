import { z } from "zod";

// O bot importa `prisma`/`encrypt`/`decrypt` diretamente de
// `@elysia-galhardo-finances/backend` (mesmo banco, mesma criptografia — ver
// docs/telegram-bot-plan.md). Isso significa que o processo do bot também
// precisa satisfazer o schema de env da API (DATABASE_URL, BETTER_AUTH_SECRET,
// ENCRYPTION_KEY, etc.) mesmo sem usar autenticação/e-mail/Stripe — por isso
// `bot/.env.example` espelha `backend/.env.example` e soma as variáveis abaixo.
const envSchema = z.object({
	TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN é obrigatório"),
	// Guardado em base64: um hash bcrypt tem "$" literais (ex: "$2b$10$..."),
	// e tanto o parser de .env do Bun quanto o do Docker Compose tentam
	// expandir "$" como referência de variável — cada um com uma sintaxe de
	// escape diferente e incompatível entre si. Base64 evita o problema por
	// completo, nos dois lugares (ver bot/scripts/hash-password.ts).
	BOT_PASSWORD_HASH_BASE64: z
		.string()
		.min(1, "BOT_PASSWORD_HASH_BASE64 é obrigatório (gere com `bun run hash-password`)"),
	BOT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
	BOT_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
});

type RawBotEnv = z.infer<typeof envSchema>;
export type BotEnv = Omit<RawBotEnv, "BOT_PASSWORD_HASH_BASE64"> & { BOT_PASSWORD_HASH: string };

function loadEnv(): BotEnv {
	const raw = Object.fromEntries(
		Object.entries(Bun.env).map(([key, value]) => [key, value === "" ? undefined : value]),
	);
	const parsed = envSchema.safeParse(raw);

	if (!parsed.success) {
		console.error("Variaveis de ambiente do bot invalidas:");
		console.error(z.treeifyError(parsed.error));
		throw new Error("Falha ao carregar variaveis de ambiente do bot. Verifique seu bot/.env.");
	}

	const { BOT_PASSWORD_HASH_BASE64, ...rest } = parsed.data;
	return { ...rest, BOT_PASSWORD_HASH: Buffer.from(BOT_PASSWORD_HASH_BASE64, "base64").toString("utf8") };
}

export const env = loadEnv();
