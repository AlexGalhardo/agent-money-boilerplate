import type { PixCharge } from "../../../prisma/generated/client/client";
import { env } from "../../config/env";
import { AbacatePayNotConfiguredError, abacatepay } from "../../lib/abacatepay";
import { AppError } from "../../lib/errors";
import { userRepository } from "../users/user.repository";
import { paymentRepository } from "./payment.repository";
import type { PlanId, WebhookEvent } from "./payment.schema";
import { PLAN_DEFINITIONS } from "./payment.schema";

export { AbacatePayNotConfiguredError };

const PIX_EXPIRES_IN_SECONDS = 10 * 60;
const PAID_REMOTE_STATUSES = new Set(["PAID", "COMPLETED"]);

export class PixTestModeDisabledError extends AppError {
	constructor() {
		super("O modo de teste do PIX está desativado", 403);
	}
}

export class PixChargeNotFoundError extends AppError {
	constructor() {
		super("Cobrança PIX não encontrada", 404);
	}
}

function addMonths(date: Date, months: number): Date {
	const result = new Date(date);
	result.setMonth(result.getMonth() + months);
	return result;
}

function planMonths(plan: string): number {
	return PLAN_DEFINITIONS[plan as PlanId]?.months ?? 1;
}

/** Extends from the current expiry when the plan is still running, so renewing early never loses days. */
async function activatePlanForCharge(charge: Pick<PixCharge, "id" | "userId" | "plan">): Promise<Date> {
	const user = await userRepository.findByIdOrThrow(charge.userId);
	const base =
		user.planStatus === "active" && user.planExpiresAt && user.planExpiresAt > new Date()
			? user.planExpiresAt
			: new Date();
	const planExpiresAt = addMonths(base, planMonths(charge.plan));

	await paymentRepository.activatePlan(charge.id, charge.userId, planExpiresAt);
	return planExpiresAt;
}

async function completeCharge(charge: PixCharge, eventType: string, rawPayload: unknown): Promise<void> {
	if (charge.status !== "paid") await activatePlanForCharge(charge);
	await paymentRepository.logEvent({
		userId: charge.userId,
		externalId: charge.externalId,
		eventType,
		status: "succeeded",
		amount: charge.amount,
		rawPayload,
	});
}

export const paymentService = {
	async getPlanStatus(userId: string): Promise<{ planStatus: string; planExpiresAt: string | null }> {
		const user = await userRepository.findByIdOrThrow(userId);
		return { planStatus: user.planStatus, planExpiresAt: user.planExpiresAt?.toISOString() ?? null };
	},

	async listHistory(userId: string) {
		const logs = await paymentRepository.listLogs(userId);
		return logs.map((log) => ({
			id: log.id,
			eventType: log.eventType,
			status: log.status,
			amount: log.amount,
			currency: log.currency,
			createdAt: log.createdAt.toISOString(),
		}));
	},

	async createPixCheckout(
		userId: string,
		plan: PlanId,
	): Promise<{ id: string; brCode: string; brCodeBase64: string; expiresAt: string }> {
		const definition = PLAN_DEFINITIONS[plan];

		// AbacatePay rejects non-ASCII characters (e.g. an em dash) in
		// `description` — hence the plain hyphen.
		const charge = await abacatepay.createPixCharge({
			amount: definition.amount,
			description: `Agent Money Boilerplate - plano ${definition.label}`,
			expiresIn: PIX_EXPIRES_IN_SECONDS,
			metadata: { userId, plan },
		});

		const expiresAt = charge.expiresAt ?? new Date(Date.now() + PIX_EXPIRES_IN_SECONDS * 1000).toISOString();
		const pixCharge = await paymentRepository.createCharge({
			userId,
			externalId: charge.id,
			plan,
			amount: definition.amount,
			status: "pending",
			brCode: charge.brCode,
			brCodeBase64: charge.brCodeBase64,
			expiresAt: new Date(expiresAt),
		});

		await paymentRepository.logEvent({
			userId,
			externalId: charge.id,
			eventType: "pix.created",
			status: "pending",
			amount: definition.amount,
			rawPayload: charge,
		});

		// The INTERNAL id (PixCharge.id), not AbacatePay's externalId — it is
		// what /payments/pix/:id/status and /simulate expect back.
		return { id: pixCharge.id, brCode: charge.brCode, brCodeBase64: charge.brCodeBase64, expiresAt };
	},

	// Polls AbacatePay directly — covers local/dev, where the webhook (which
	// needs a public HTTPS endpoint) never arrives.
	async getCheckoutStatus(
		userId: string,
		chargeId: string,
	): Promise<{ status: string; planExpiresAt: string | null; months: number }> {
		const charge = await paymentRepository.findChargeForUser(chargeId, userId);
		if (!charge) throw new PixChargeNotFoundError();

		if (charge.status === "pending" && charge.expiresAt < new Date()) {
			await paymentRepository.setChargeStatus(charge.id, "expired");
			await paymentRepository.logEvent({
				userId,
				externalId: charge.externalId,
				eventType: "pix.expired",
				status: "expired",
				amount: charge.amount,
				rawPayload: { chargeId: charge.id, expiresAt: charge.expiresAt },
			});
		} else if (charge.status === "pending") {
			const remote = await abacatepay.checkPixCharge(charge.externalId);
			if (PAID_REMOTE_STATUSES.has(remote.status)) {
				await completeCharge(charge, "pix.completed", remote);
			}
		}

		const updated = await paymentRepository.findChargeByIdOrThrow(charge.id);
		const user = await userRepository.findByIdOrThrow(userId);

		return {
			status: updated.status,
			planExpiresAt: updated.status === "paid" ? (user.planExpiresAt?.toISOString() ?? null) : null,
			months: planMonths(updated.plan),
		};
	},

	async simulateCheckout(userId: string, chargeId: string): Promise<void> {
		if (!env.ABACATEPAY_PIX_TEST_MODE) throw new PixTestModeDisabledError();

		const charge = await paymentRepository.findChargeForUser(chargeId, userId);
		if (!charge) throw new PixChargeNotFoundError();

		const result = await abacatepay.simulatePayment(charge.externalId);
		await completeCharge(charge, "pix.completed", result);
	},

	/**
	 * AbacatePay doesn't publicly document a signature header for webhooks, so
	 * the route authenticates them with a `?webhookSecret=` query parameter.
	 * Query strings end up in proxy/access logs, so the secret alone is not
	 * trusted to grant a plan: a "completed" event is re-checked against the
	 * AbacatePay API before activating anything.
	 */
	async handleWebhookEvent(payload: WebhookEvent): Promise<void> {
		const charge = await paymentRepository.findChargeByExternalId(payload.data.id);
		if (!charge) return;

		switch (payload.event) {
			case "transparent.completed": {
				const remote = await abacatepay.checkPixCharge(charge.externalId);
				if (!PAID_REMOTE_STATUSES.has(remote.status)) {
					console.warn(
						`[webhook] ignoring completed event for charge ${charge.id}: remote status ${remote.status}`,
					);
					return;
				}
				await completeCharge(charge, payload.event, payload);
				break;
			}

			case "transparent.refunded":
			case "transparent.disputed":
			case "transparent.lost": {
				await paymentRepository.setChargeStatus(charge.id, "failed");
				await paymentRepository.logEvent({
					userId: charge.userId,
					externalId: charge.externalId,
					eventType: payload.event,
					status: "failed",
					amount: charge.amount,
					rawPayload: payload,
				});
				break;
			}

			default:
				break;
		}
	},

	checkExpiredPlans(): Promise<number> {
		return paymentRepository.expireOverduePlans(new Date());
	},
};
