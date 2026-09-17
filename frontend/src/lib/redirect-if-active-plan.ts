import { redirect } from "@tanstack/react-router";
import { hasActivePlan } from "./plan";
import { requireAuth } from "./require-auth";
import { getServerPlan } from "./server-session";

/** Usado pelo /checkout: usuário com plano PRO ainda vigente não tem o que
 * comprar ali, então é mandado pra Minha Conta em vez de ver a tela de planos. */
export async function requireNoActivePlan() {
	const { session } = await requireAuth();
	const plan = await getServerPlan();

	if (plan && hasActivePlan(plan)) {
		throw redirect({ to: "/minha-conta" });
	}

	return { session };
}
