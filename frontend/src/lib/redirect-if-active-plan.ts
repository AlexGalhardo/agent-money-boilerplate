import { redirect } from "@tanstack/react-router";
import { hasActivePlan } from "./plan";
import { requireAuth } from "./require-auth";
import { getServerPlan } from "./server-session";

/** Used by /checkout: a user with a running PRO plan has nothing to buy
 * there, so they're sent to "Minha conta" instead of the plans screen. */
export async function requireNoActivePlan() {
	const { session } = await requireAuth();
	const plan = await getServerPlan();

	if (plan && hasActivePlan(plan)) {
		throw redirect({ to: "/minha-conta" });
	}

	return { session };
}
