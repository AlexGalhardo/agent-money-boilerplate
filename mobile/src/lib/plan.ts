// Same plan logic as the frontend (frontend/src/lib/plan.ts).
export const FREE_TRANSACTION_LIMIT = 10;

export function hasActivePlan(user: { planStatus: string; planExpiresAt: string | Date | null }): boolean {
	return user.planStatus === "active" && (user.planExpiresAt === null || new Date(user.planExpiresAt) > new Date());
}

/** Days left on the PRO plan, rounded up — or `null` with no active plan or
 * no expiry date (lifetime plan). */
export function planDaysRemaining(user: { planStatus: string; planExpiresAt: string | Date | null }): number | null {
	if (!hasActivePlan(user) || !user.planExpiresAt) return null;
	const diffMs = new Date(user.planExpiresAt).getTime() - Date.now();
	return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

const SHOW_DATE_AFTER_DAYS = 60;

/** "12 dias restantes" for short plans, "até 31/12/2099" for long ones, null without an active plan. */
export function planRemainingLabel(user: { planStatus: string; planExpiresAt: string | Date | null }): string | null {
	const days = planDaysRemaining(user);
	if (days === null || !user.planExpiresAt) return null;
	if (days > SHOW_DATE_AFTER_DAYS) return `até ${new Date(user.planExpiresAt).toLocaleDateString("pt-BR")}`;
	return `${days} dia${days === 1 ? "" : "s"} restante${days === 1 ? "" : "s"}`;
}
