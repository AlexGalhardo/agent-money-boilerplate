export const FREE_TRANSACTION_LIMIT = 10;

export function hasActivePlan(user: { planStatus: string; planExpiresAt: Date | null }): boolean {
	return user.planStatus === "active" && (user.planExpiresAt === null || user.planExpiresAt > new Date());
}

export class FreeLimitReachedError extends Error {
	constructor() {
		super(
			`Limite de ${FREE_TRANSACTION_LIMIT} transações do plano gratuito atingido. Assine um plano para continuar.`,
		);
		this.name = "FreeLimitReachedError";
	}
}
