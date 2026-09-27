export const FREE_TRANSACTION_LIMIT = 10;

export function hasActivePlan(user: { planStatus: string; planExpiresAt: string | Date | null }): boolean {
	return user.planStatus === "active" && (user.planExpiresAt === null || new Date(user.planExpiresAt) > new Date());
}

/** Days left on the PRO plan, rounded up (the expiry day still counts as 1)
 * — or `null` with no active plan or no expiry date (lifetime plan). */
export function planDaysRemaining(user: { planStatus: string; planExpiresAt: string | Date | null }): number | null {
	if (!hasActivePlan(user) || !user.planExpiresAt) return null;
	const diffMs = new Date(user.planExpiresAt).getTime() - Date.now();
	return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
