export const FREE_TRANSACTION_LIMIT = 10;

export function hasActivePlan(user: { planStatus: string; planExpiresAt: string | Date | null }): boolean {
	return user.planStatus === "active" && (user.planExpiresAt === null || new Date(user.planExpiresAt) > new Date());
}
