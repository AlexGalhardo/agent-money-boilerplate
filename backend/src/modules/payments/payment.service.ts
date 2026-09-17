import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { AbacatePayNotConfiguredError, abacatepay } from "../../lib/abacatepay";
import type { PlanId } from "./payment.schema";
import { PLAN_DEFINITIONS } from "./payment.schema";

export { AbacatePayNotConfiguredError };

const PIX_EXPIRES_IN_SECONDS = 10 * 60;

export class PixTestModeDisabledError extends Error {
	constructor() {
		super("O modo de teste do PIX está desativado (ABACATEPAY_PIX_TEST_MODE=false)");
		this.name = "PixTestModeDisabledError";
	}
}

export class PixChargeNotFoundError extends Error {
	constructor() {
		super("Cobrança PIX não encontrada");
		this.name = "PixChargeNotFoundError";
	}
}

function addMonths(date: Date, months: number): Date {
	const result = new Date(date);
	result.setMonth(result.getMonth() + months);
	return result;
}

async function activatePlanForCharge(charge: { id: string; userId: string; plan: string }): Promise<Date> {
	const user = await prisma.user.findUniqueOrThrow({ where: { id: charge.userId } });
	const months = PLAN_DEFINITIONS[charge.plan as PlanId]?.months ?? 1;
	const base =
		user.planStatus === "active" && user.planExpiresAt && user.planExpiresAt > new Date()
			? user.planExpiresAt
			: new Date();
	const planExpiresAt = addMonths(base, months);

	await prisma.$transaction([
		prisma.user.update({ where: { id: charge.userId }, data: { planStatus: "active", planExpiresAt } }),
		prisma.pixCharge.update({ where: { id: charge.id }, data: { status: "paid" } }),
	]);

	return planExpiresAt;
}

async function logPaymentEvent(input: {
	userId: string;
	externalId: string;
	eventType: string;
	status: string;
	amount?: number | null;
	rawPayload: unknown;
}): Promise<void> {
	await prisma.paymentLog.upsert({
		where: { externalId: input.externalId },
		create: {
			userId: input.userId,
			externalId: input.externalId,
			eventType: input.eventType,
			status: input.status,
			amount: input.amount ?? null,
			currency: "BRL",
			rawPayload: JSON.stringify(input.rawPayload),
		},
		update: { status: input.status, eventType: input.eventType },
	});
}

export const paymentService = {
	async createPixCheckout(
		userId: string,
		plan: PlanId,
	): Promise<{ id: string; brCode: string; brCodeBase64: string; expiresAt: string }> {
		const definition = PLAN_DEFINITIONS[plan];

		// A AbacatePay rejeita caracteres fora do ASCII básico (ex: "—") no
		// campo description — por isso o hífen normal aqui, não um em-dash.
		const charge = await abacatepay.createPixCharge({
			amount: definition.amount,
			description: `Elysia Finanças - plano ${definition.label}`,
			expiresIn: PIX_EXPIRES_IN_SECONDS,
			metadata: { userId, plan },
		});

		const pixCharge = await prisma.pixCharge.create({
			data: {
				userId,
				externalId: charge.id,
				plan,
				amount: definition.amount,
				status: "pending",
				brCode: charge.brCode,
				brCodeBase64: charge.brCodeBase64,
				expiresAt: new Date(charge.expiresAt ?? Date.now() + PIX_EXPIRES_IN_SECONDS * 1000),
			},
		});

		await logPaymentEvent({
			userId,
			externalId: charge.id,
			eventType: "pix.created",
			status: "pending",
			amount: definition.amount,
			rawPayload: charge,
		});

		// Retorna o id INTERNO (PixCharge.id), não o externalId da AbacatePay —
		// é o que GET /payments/pix/:id/status e /simulate esperam receber de
		// volta do cliente.
		return {
			id: pixCharge.id,
			brCode: charge.brCode,
			brCodeBase64: charge.brCodeBase64,
			expiresAt: charge.expiresAt ?? new Date(Date.now() + PIX_EXPIRES_IN_SECONDS * 1000).toISOString(),
		};
	},

	// Reconsulta a AbacatePay diretamente — cobre o caso local/dev em que o
	// webhook (que exige endpoint HTTPS público) nunca chega.
	async getCheckoutStatus(
		userId: string,
		chargeId: string,
	): Promise<{ status: string; planExpiresAt: string | null; months: number }> {
		const charge = await prisma.pixCharge.findFirst({ where: { id: chargeId, userId } });
		if (!charge) throw new PixChargeNotFoundError();

		if (charge.status === "pending" && charge.expiresAt < new Date()) {
			await prisma.pixCharge.update({ where: { id: charge.id }, data: { status: "expired" } });
			await logPaymentEvent({
				userId,
				externalId: charge.externalId,
				eventType: "pix.expired",
				status: "expired",
				amount: charge.amount,
				rawPayload: { chargeId: charge.id, expiresAt: charge.expiresAt },
			});
		} else if (charge.status === "pending") {
			const remote = await abacatepay.checkPixCharge(charge.externalId);
			if (remote.status === "PAID" || remote.status === "COMPLETED") {
				await activatePlanForCharge(charge);
				await logPaymentEvent({
					userId,
					externalId: charge.externalId,
					eventType: "pix.completed",
					status: "succeeded",
					amount: charge.amount,
					rawPayload: remote,
				});
			}
		}

		const updated = await prisma.pixCharge.findUniqueOrThrow({ where: { id: charge.id } });
		const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

		return {
			status: updated.status,
			planExpiresAt: updated.status === "paid" ? (user.planExpiresAt?.toISOString() ?? null) : null,
			months: PLAN_DEFINITIONS[updated.plan as PlanId].months,
		};
	},

	async simulateCheckout(userId: string, chargeId: string): Promise<void> {
		if (!env.ABACATEPAY_PIX_TEST_MODE) throw new PixTestModeDisabledError();

		const charge = await prisma.pixCharge.findFirst({ where: { id: chargeId, userId } });
		if (!charge) throw new PixChargeNotFoundError();

		const result = await abacatepay.simulatePayment(charge.externalId);

		await activatePlanForCharge(charge);
		await logPaymentEvent({
			userId,
			externalId: charge.externalId,
			eventType: "pix.completed",
			status: "succeeded",
			amount: charge.amount,
			rawPayload: result,
		});
	},

	// A AbacatePay não documenta publicamente o cabeçalho HTTP usado para
	// assinar o payload do webhook (ver docs/pagamentos.md) — por isso a
	// verificação aqui usa o parâmetro de query `webhookSecret`, seguindo o
	// padrão de URL registrado em `POST /webhooks/create`
	// (`/webhook/abacatepay?webhookSecret=<secret>`).
	async handleWebhookEvent(payload: { event: string; data: { id: string } }): Promise<void> {
		const charge = await prisma.pixCharge.findUnique({ where: { externalId: payload.data.id } });
		if (!charge) return;

		switch (payload.event) {
			case "transparent.completed": {
				if (charge.status !== "paid") await activatePlanForCharge(charge);
				await logPaymentEvent({
					userId: charge.userId,
					externalId: charge.externalId,
					eventType: payload.event,
					status: "succeeded",
					amount: charge.amount,
					rawPayload: payload,
				});
				break;
			}

			case "transparent.refunded":
			case "transparent.disputed":
			case "transparent.lost": {
				await prisma.pixCharge.update({ where: { id: charge.id }, data: { status: "failed" } });
				await logPaymentEvent({
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

	async checkExpiredPlans(): Promise<number> {
		const result = await prisma.user.updateMany({
			where: { planStatus: "active", planExpiresAt: { lt: new Date() } },
			data: { planStatus: "expired" },
		});

		return result.count;
	},
};
