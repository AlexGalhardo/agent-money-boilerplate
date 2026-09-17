import { z } from "zod";

const boolFromString = z
	.enum(["true", "false"])
	.default("false")
	.transform((value) => value === "true");

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	PORT: z.coerce.number().int().positive().default(4000),
	APP_URL: z.url().default("http://localhost:4000"),
	FRONTEND_URL: z.url().default("http://localhost:4001"),

	DATABASE_PROVIDER: z.enum(["sqlite", "postgresql"]).default("sqlite"),
	DATABASE_URL: z.string().min(1),

	BETTER_AUTH_SECRET: z.string().min(32),

	// 32 bytes em hexadecimal (64 caracteres), usado para AES-256-GCM.
	ENCRYPTION_KEY: z
		.string()
		.regex(/^[0-9a-f]{64}$/i, "ENCRYPTION_KEY deve ter 64 caracteres hexadecimais (32 bytes)"),

	ENABLE_CONFIRM_EMAIL: boolFromString,
	ENABLE_2FA: boolFromString,
	ENABLE_ABACATEPAY: boolFromString,

	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),

	RESEND_API_KEY: z.string().optional(),
	RESEND_FROM_EMAIL: z.email().optional(),

	ABACATEPAY_API_KEY: z.string().optional(),
	ABACATEPAY_WEBHOOK_SECRET: z.string().optional(),
	// Botão "Pagar PIX Teste Mode" no /checkout + endpoint de simulação de
	// pagamento (sandbox/devMode da AbacatePay) — nunca ligar em produção.
	ABACATEPAY_PIX_TEST_MODE: boolFromString,

	CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
	// Variáveis opcionais deixadas em branco no .env (ex: "RESEND_FROM_EMAIL=")
	// chegam como string vazia, não undefined — sem isso, validadores de
	// formato como z.email() rejeitam um .env local com campos opcionais
	// não preenchidos.
	const raw = Object.fromEntries(
		Object.entries(Bun.env).map(([key, value]) => [key, value === "" ? undefined : value]),
	);
	const parsed = envSchema.safeParse(raw);

	if (!parsed.success) {
		console.error("Variaveis de ambiente invalidas:");
		console.error(z.treeifyError(parsed.error));
		throw new Error("Falha ao carregar variaveis de ambiente. Verifique seu .env.");
	}

	return parsed.data;
}

export const env = loadEnv();
