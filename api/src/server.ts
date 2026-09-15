import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { env } from "./config/env";
import { authPlugin } from "./lib/auth.plugin";
import { cronRoutes, paymentRoutes, paymentWebhookRoutes } from "./modules/payments/payment.routes";
import { transactionRoutes } from "./modules/transactions/transaction.routes";
import { transactionImportRoutes } from "./modules/transactions/transaction-import.routes";
import { userRoutes } from "./modules/users/user.routes";

export const app = new Elysia()
	.use(
		cors({
			origin: env.FRONTEND_URL,
			credentials: true,
		}),
	)
	.use(
		swagger({
			path: "/docs",
			documentation: {
				info: {
					title: "Elysia Finanças API",
					version: "0.0.1-alpha",
					description: "API de finanças pessoais — autenticação, transações e pagamentos.",
				},
			},
		}),
	)
	.onError(({ code, error, set }) => {
		if (code === "VALIDATION") {
			set.status = 400;
			return { success: false, message: error.message };
		}

		if (code === "NOT_FOUND") {
			set.status = 404;
			return { success: false, message: "Route not found" };
		}

		console.error(error);
		set.status = 500;
		return { success: false, message: "Internal server error" };
	})
	.get("/", () => ({ success: true, message: "Elysia Finanças API" }))
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
	.use(paymentRoutes)
	.use(paymentWebhookRoutes)
	.use(cronRoutes)
	.listen(env.PORT);

export const serverDNS = `${app.server?.hostname}:${app.server?.port}`;

console.log(`🦊 Elysia Finanças API rodando em http://${serverDNS}`);

export type App = typeof app;
