import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageLayout } from "../components/page-layout";
import { PixCheckoutModal } from "../components/pix-checkout-modal";
import { api } from "../lib/api";
import { requireNoActivePlan } from "../lib/redirect-if-active-plan";
import { useAppConfig } from "../lib/use-app-config";

export const Route = createFileRoute("/checkout")({
	head: () => ({ meta: [{ title: "Escolha seu plano — Money" }] }),
	beforeLoad: requireNoActivePlan,
	component: CheckoutPage,
});

type PlanId = "monthly" | "annual";
type Charge = { id: string; brCode: string; brCodeBase64: string; expiresAt: string };

const plans: {
	id: PlanId;
	label: string;
	price: string;
	description: string;
}[] = [
	{ id: "monthly", label: "Mensal", price: "R$ 9,90", description: "1 mês de acesso ao plano PRO." },
	{
		id: "annual",
		label: "Anual",
		price: "R$ 99,90",
		description: "12 meses de acesso ao plano PRO (2 meses grátis).",
	},
];

function CheckoutPage() {
	const { data: config } = useAppConfig();
	const queryClient = useQueryClient();

	const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [charge, setCharge] = useState<Charge | null>(null);

	async function handlePay(plan: PlanId): Promise<void> {
		setError(null);
		setLoadingPlan(plan);

		const { data, error: requestError } = await api.payments.pix.checkout.post({ plan });
		setLoadingPlan(null);

		if (requestError || !data || !("id" in data)) {
			setError((data as { message?: string } | undefined)?.message ?? "Não foi possível gerar o PIX");
			return;
		}

		setCharge({ id: data.id, brCode: data.brCode, brCodeBase64: data.brCodeBase64, expiresAt: data.expiresAt });
	}

	function handlePaid(): void {
		// PixCheckoutModal itself shows the confirmation and redirects to
		// /dashboard after the cooldown — this only invalidates the cache so
		// those pages load the updated plan data.
		queryClient.invalidateQueries({ queryKey: ["me"] });
		queryClient.invalidateQueries({ queryKey: ["plan-status"] });
		queryClient.invalidateQueries({ queryKey: ["payment-history"] });
	}

	return (
		<PageLayout>
			<section className="mx-auto max-w-3xl px-4 py-16">
				<h1 className="text-3xl font-bold">Escolha seu plano</h1>
				<p className="mt-2 text-(--color-fg-muted)">Pagamento único via PIX, sem renovação automática.</p>

				{error && <p className="mt-4 text-sm text-red-500">{error}</p>}

				<div className="mt-8 grid gap-6 sm:grid-cols-2">
					{plans.map((plan) => (
						<div
							key={plan.id}
							className="flex flex-col rounded-2xl border border-(--color-border) bg-(--color-surface) p-6"
						>
							<h2 className="text-lg font-semibold">{plan.label}</h2>
							<p className="mt-2 text-3xl font-bold">{plan.price}</p>
							<p className="mt-2 flex-1 text-sm text-(--color-fg-muted)">{plan.description}</p>

							<button
								type="button"
								onClick={() => handlePay(plan.id)}
								disabled={loadingPlan !== null}
								className="mt-6 rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-black hover:bg-brand-400 disabled:opacity-60"
							>
								{loadingPlan === plan.id ? "Gerando PIX..." : "Pagar com PIX"}
							</button>
						</div>
					))}
				</div>
			</section>

			{charge && (
				<PixCheckoutModal
					charge={charge}
					testModeEnabled={Boolean(config?.abacatepayPixTestMode)}
					onClose={() => setCharge(null)}
					onPaid={handlePaid}
				/>
			)}
		</PageLayout>
	);
}
