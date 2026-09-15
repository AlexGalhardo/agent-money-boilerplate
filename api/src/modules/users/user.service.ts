import { prisma } from "../../config/prisma";
import { hasActivePlan } from "../../lib/plan";
import type { UpdateProfileInput } from "./user.schema";

export const ACCOUNT_DELETION_GRACE_DAYS = 30;

export class ActivePlanError extends Error {
	constructor() {
		super("Não é possível excluir a conta enquanto houver um plano ativo. Cancele o plano antes de continuar.");
		this.name = "ActivePlanError";
	}
}

export const userService = {
	updateProfile(userId: string, input: UpdateProfileInput) {
		// "" desvincula o Telegram (vira null) — não pode persistir "" porque
		// telegramChatId é @unique e todo mundo desvinculando colidiria.
		const { telegramChatId, ...rest } = input;
		return prisma.user.update({
			where: { id: userId },
			data: { ...rest, ...(telegramChatId !== undefined ? { telegramChatId: telegramChatId || null } : {}) },
		});
	},

	// Plano gratuito: exclusão é adiada (soft-delete) por ACCOUNT_DELETION_GRACE_DAYS
	// dias — um login nesse período cancela o pedido (ver databaseHooks.session.create
	// em api/src/lib/auth.ts). A exclusão definitiva acontece pelo cron
	// /cron/delete-pending-accounts (userService.purgePendingDeletions).
	async requestDeletion(userId: string): Promise<{ deletionRequestedAt: Date }> {
		const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

		if (hasActivePlan(user)) {
			throw new ActivePlanError();
		}

		const updated = await prisma.user.update({
			where: { id: userId },
			data: { deletionRequestedAt: new Date() },
		});

		return { deletionRequestedAt: updated.deletionRequestedAt as Date };
	},

	async purgePendingDeletions(): Promise<number> {
		const cutoff = new Date(Date.now() - ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);

		const result = await prisma.user.deleteMany({
			where: { deletionRequestedAt: { lte: cutoff } },
		});

		return result.count;
	},
};
