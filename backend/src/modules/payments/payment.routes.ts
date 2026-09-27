import { Elysia } from "elysia";
import { env } from "../../config/env";
import { authPlugin } from "../../lib/auth.plugin";
import { secureCompare } from "../../lib/secure-compare";
import { userService } from "../users/user.service";
import {
	createPixCheckoutSchema,
	pixChargeIdParamSchema,
	webhookEventSchema,
	webhookQuerySchema,
} from "./payment.schema";
import { paymentService } from "./payment.service";

export const paymentRoutes = new Elysia({ prefix: "/payments" })
	.use(authPlugin)
	.guard({ auth: true })
	.get("/status", async ({ user }) => ({ success: true, plan: await paymentService.getPlanStatus(user.id) }))
	.get("/history", async ({ user }) => ({ success: true, logs: await paymentService.listHistory(user.id) }))
	.post(
		"/pix/checkout",
		async ({ user, body }) => ({ success: true, ...(await paymentService.createPixCheckout(user.id, body.plan)) }),
		{ body: createPixCheckoutSchema },
	)
	.get(
		"/pix/:id/status",
		async ({ user, params }) => ({
			success: true,
			...(await paymentService.getCheckoutStatus(user.id, params.id)),
		}),
		{ params: pixChargeIdParamSchema },
	)
	.post(
		"/pix/:id/simulate",
		async ({ user, params }) => {
			await paymentService.simulateCheckout(user.id, params.id);
			return { success: true };
		},
		{ params: pixChargeIdParamSchema },
	);

// Registered on AbacatePay as
// `<APP_URL>/webhook/abacatepay?webhookSecret=<ABACATEPAY_WEBHOOK_SECRET>` —
// see paymentService.handleWebhookEvent for why the secret alone isn't trusted.
export const paymentWebhookRoutes = new Elysia().post(
	"/webhook/abacatepay",
	async ({ query, body, status }) => {
		if (!env.ENABLE_ABACATEPAY || !env.ABACATEPAY_WEBHOOK_SECRET) {
			return status(503, { success: false, message: "Webhook não configurado" });
		}

		if (!secureCompare(query.webhookSecret, env.ABACATEPAY_WEBHOOK_SECRET)) {
			return status(401, { success: false, message: "Não autorizado" });
		}

		await paymentService.handleWebhookEvent(body);
		return { success: true };
	},
	{ query: webhookQuerySchema, body: webhookEventSchema },
);

function isAuthorizedCron(authorization: string | undefined): boolean {
	return Boolean(env.CRON_SECRET) && secureCompare(authorization, `Bearer ${env.CRON_SECRET}`);
}

// Vercel Cron calls these via GET with `Authorization: Bearer <CRON_SECRET>`
// (see backend/vercel.json); any other scheduler must send the same header.
export const cronRoutes = new Elysia()
	.get("/cron/check-expired-plans", async ({ headers, status }) => {
		if (!isAuthorizedCron(headers.authorization)) {
			return status(401, { success: false, message: "Não autorizado" });
		}
		return { success: true, updated: await paymentService.checkExpiredPlans() };
	})
	.get("/cron/delete-pending-accounts", async ({ headers, status }) => {
		if (!isAuthorizedCron(headers.authorization)) {
			return status(401, { success: false, message: "Não autorizado" });
		}
		return { success: true, deleted: await userService.purgePendingDeletions() };
	});
