// Mesma lógica de plano do frontend (ver frontend/src/lib/plan.ts).
export const FREE_TRANSACTION_LIMIT = 10;

export function hasActivePlan(user: { planStatus: string; planExpiresAt: string | Date | null }): boolean {
	return user.planStatus === "active" && (user.planExpiresAt === null || new Date(user.planExpiresAt) > new Date());
}

/** Dias restantes do plano PRO, arredondado pra cima — ou `null` sem plano
 * ativo ou sem data de expiração (plano vitalício). */
export function planDaysRemaining(user: { planStatus: string; planExpiresAt: string | Date | null }): number | null {
	if (!hasActivePlan(user) || !user.planExpiresAt) return null;
	const diffMs = new Date(user.planExpiresAt).getTime() - Date.now();
	return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
