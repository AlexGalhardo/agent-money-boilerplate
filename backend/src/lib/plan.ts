import { AppError } from "./errors";

export const FREE_TRANSACTION_LIMIT = 10;

type PlanFields = { planStatus: string; planExpiresAt: Date | null };

export function hasActivePlan(user: PlanFields): boolean {
	return user.planStatus === "active" && (user.planExpiresAt === null || user.planExpiresAt > new Date());
}

/** How many more transactions the user may create right now (unbounded on an active plan). */
export function transactionAllowance(user: PlanFields & { freeTransactionCount: number }): number {
	if (hasActivePlan(user)) return Number.POSITIVE_INFINITY;
	return Math.max(0, FREE_TRANSACTION_LIMIT - user.freeTransactionCount);
}

export class FreeLimitReachedError extends AppError {
	constructor() {
		super(
			`Limite de ${FREE_TRANSACTION_LIMIT} transações do plano gratuito atingido. Assine um plano para continuar.`,
			403,
		);
	}
}
