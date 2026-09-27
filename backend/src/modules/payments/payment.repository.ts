import type { PaymentLog, PixCharge, Prisma } from "../../../prisma/generated/client/client";
import { prisma } from "../../config/prisma";

export type PaymentLogInput = {
	userId: string;
	externalId: string;
	eventType: string;
	status: string;
	amount?: number | null;
	rawPayload: unknown;
};

export const paymentRepository = {
	createCharge(data: Prisma.PixChargeUncheckedCreateInput): Promise<PixCharge> {
		return prisma.pixCharge.create({ data });
	},

	findChargeForUser(id: string, userId: string): Promise<PixCharge | null> {
		return prisma.pixCharge.findFirst({ where: { id, userId } });
	},

	findChargeByExternalId(externalId: string): Promise<PixCharge | null> {
		return prisma.pixCharge.findUnique({ where: { externalId } });
	},

	findChargeByIdOrThrow(id: string): Promise<PixCharge> {
		return prisma.pixCharge.findUniqueOrThrow({ where: { id } });
	},

	async setChargeStatus(id: string, status: string): Promise<void> {
		await prisma.pixCharge.update({ where: { id }, data: { status } });
	},

	/** Marks the charge paid and extends the plan in one transaction. */
	async activatePlan(chargeId: string, userId: string, planExpiresAt: Date): Promise<void> {
		await prisma.$transaction([
			prisma.user.update({ where: { id: userId }, data: { planStatus: "active", planExpiresAt } }),
			prisma.pixCharge.update({ where: { id: chargeId }, data: { status: "paid" } }),
		]);
	},

	async logEvent(input: PaymentLogInput): Promise<void> {
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
	},

	listLogs(userId: string): Promise<PaymentLog[]> {
		return prisma.paymentLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
	},

	async expireOverduePlans(now: Date): Promise<number> {
		const result = await prisma.user.updateMany({
			where: { planStatus: "active", planExpiresAt: { lt: now } },
			data: { planStatus: "expired" },
		});
		return result.count;
	},
};
