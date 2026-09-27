import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { z } from "zod";
import { env } from "./config/env";
import { authPlugin } from "./lib/auth.plugin";
import { AppError } from "./lib/errors";
import { cronRoutes, paymentRoutes, paymentWebhookRoutes } from "./modules/payments/payment.routes";
import { telegramRoutes } from "./modules/telegram/telegram.routes";
import { transactionRoutes } from "./modules/transactions/transaction.routes";
import { transactionImportRoutes } from "./modules/transactions/transaction-import.routes";
import { userRoutes } from "./modules/users/user.routes";

// Public developer API only (transactions, authenticated with `x-api-key`).
// The spec is served at /openapi/json and rendered by Scalar on the
// frontend's /api page — no UI here (`provider: null`).
const openapiPlugin = openapi({
	provider: null,
	mapJsonSchema: { zod: z.toJSONSchema },
	exclude: { paths: [/^\/(?!transactions)/] },
	documentation: {
		info: {
			title: "Agent Money API",
			version: "0.2.0",
			description:
				"Acesse suas transações programaticamente. Gere um token em /api e envie-o no header `x-api-key` de cada requisição.",
		},
		components: {
			securitySchemes: { apiKey: { type: "apiKey", in: "header", name: "x-api-key" } },
		},
		security: [{ apiKey: [] }],
	},
});

/** The HTTP app without a listening socket — imported by tests and `server.ts`. */
export const app = new Elysia()
	.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
	.use(openapiPlugin)
	.onError({ as: "global" }, ({ code, error, set }) => {
		if (error instanceof AppError) {
			set.status = error.status;
			return { success: false, message: error.message };
		}

		if (code === "VALIDATION") {
			set.status = 400;
			return { success: false, message: "Dados inválidos", errors: error.all.map((issue) => issue.summary) };
		}

		if (code === "NOT_FOUND") {
			set.status = 404;
			return { success: false, message: "Rota não encontrada" };
		}

		if (code === "PARSE") {
			set.status = 400;
			return { success: false, message: "Corpo da requisição inválido" };
		}

		console.error(error);
		set.status = 500;
		return { success: false, message: "Erro interno do servidor" };
	})
	.get("/", () => ({ success: true, message: "Agent Money Boilerplate API" }))
	.get("/config", () => ({
		success: true,
		config: {
			enableConfirmEmail: env.ENABLE_CONFIRM_EMAIL,
			enable2FA: env.ENABLE_2FA,
			enableAbacatepay: env.ENABLE_ABACATEPAY,
			abacatepayPixTestMode: env.ABACATEPAY_PIX_TEST_MODE,
		},
	}))
	.use(authPlugin)
	.use(transactionRoutes)
	.use(transactionImportRoutes)
	.use(userRoutes)
	.use(telegramRoutes)
	.use(paymentRoutes)
	.use(paymentWebhookRoutes)
	.use(cronRoutes);

export type App = typeof app;
