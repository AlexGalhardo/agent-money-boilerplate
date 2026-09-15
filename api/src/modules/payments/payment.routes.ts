import { Elysia } from "elysia";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { authPlugin } from "../../lib/auth.plugin";
import { userService } from "../users/user.service";
import { createPixCheckoutSchema } from "./payment.schema";
import {
	AbacatePayNotConfiguredError,
	PixChargeNotFoundError,
	PixTestModeDisabledError,
	paymentService,
} from "./payment.service";

export const paymentRoutes = new Elysia({ prefix: "/payments" })
	.use(authPlugin)
	.guard({ auth: true })
	.get("/status", async ({ user }) => {
		const record = await prisma.user.findUniqueOrThrow({
			where: { id: user.id },
			select: { planStatus: true, planExpiresAt: true },
		});
		return { success: true, plan: record };
	})
	.get("/history", async ({ user }) => {
		const logs = await prisma.paymentLog.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: "desc" },
		});
		return {
			success: true,
			logs: logs.map((log) => ({
				id: log.id,
				eventType: log.eventType,
				status: log.status,
				amount: log.amount,
				currency: log.currency,
				createdAt: log.createdAt.toISOString(),
			})),
		};
	})
	.post(
		"/pix/checkout",
		async ({ user, body, status }) => {
			try {
				const charge = await paymentService.createPixCheckout(user.id, body.plan);
				return { success: true, ...charge };
			} catch (error) {
				if (error instanceof AbacatePayNotConfiguredError) {
					return status(503, { success: false, message: error.message });
				}
				throw error;
			}
		},
		{ body: createPixCheckoutSchema },
	)
	.get("/pix/:id/status", async ({ user, params, status }) => {
		try {
			const result = await paymentService.getCheckoutStatus(user.id, params.id);
			return { success: true, ...result };
		} catch (error) {
			if (error instanceof PixChargeNotFoundError) {
				return status(404, { success: false, message: error.message });
			}
			throw error;
		}
	})
	.post("/pix/:id/simulate", async ({ user, params, status }) => {
		try {
			await paymentService.simulateCheckout(user.id, params.id);
			return { success: true };
		} catch (error) {
			if (error instanceof PixTestModeDisabledError) {
				return status(403, { success: false, message: error.message });
			}
			if (error instanceof PixChargeNotFoundError) {
				return status(404, { success: false, message: error.message });
			}
			throw error;
		}
	});

// Registrado na AbacatePay como `<APP_URL>/webhook/abacatepay?webhookSecret=<ABACATEPAY_WEBHOOK_SECRET>`
// (ver docs/pagamentos.md — a doc pública da AbacatePay não especifica o
// cabeçalho HTTP usado para assinar o payload, então a verificação aqui é
// via esse parâmetro de query, o mesmo padrão do `secret` de
// `POST /webhooks/create`).
export const paymentWebhookRoutes = new Elysia().post("/webhook/abacatepay", async ({ query, body, status }) => {
	if (!env.ENABLE_ABACATEPAY || !env.ABACATEPAY_WEBHOOK_SECRET) {
		return status(503, { success: false, message: "AbacatePay não está configurado" });
	}

	if (query.webhookSecret !== env.ABACATEPAY_WEBHOOK_SECRET) {
		return status(401, { success: false, message: "Assinatura inválida" });
	}

	await paymentService.handleWebhookEvent(body as { event: string; data: { id: string } });
	return { success: true };
});

// Vercel Cron chama esta rota via GET, autenticando com
// `Authorization: Bearer <CRON_SECRET>` automaticamente — ver api/vercel.json.
export const cronRoutes = new Elysia()
	.get("/cron/check-expired-plans", async ({ headers, status }) => {
		if (!env.CRON_SECRET || headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
			return status(401, { success: false, message: "Não autorizado" });
		}

		const updated = await paymentService.checkExpiredPlans();
		return { success: true, updated };
	})
	.get("/cron/delete-pending-accounts", async ({ headers, status }) => {
		if (!env.CRON_SECRET || headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
			return status(401, { success: false, message: "Não autorizado" });
		}

		const deleted = await userService.purgePendingDeletions();
		return { success: true, deleted };
	});
