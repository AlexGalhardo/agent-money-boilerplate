import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api } from "../../lib/api";
import { FREE_TRANSACTION_LIMIT, hasActivePlan } from "../../lib/plan";
import { useAppConfig } from "../../lib/use-app-config";
import { AccordionCard } from "../accordion-card";

const PAYMENT_EVENT_LABELS: Record<string, string> = {
	succeeded: "Pagamento confirmado",
	expired: "PIX expirado",
};

type Props = {
	planStatus: string;
	planExpiresAt: string | null;
	freeTransactionCount: number;
};

function usePaymentHistory() {
	return useQuery({
		queryKey: ["payment-history"],
		queryFn: async () => {
			const { data, error } = await api.payments.history.get();
			if (error || !data || !("logs" in data)) throw error ?? new Error("Falha ao carregar histórico");
			return data.logs;
		},
	});
}

export function PlanSection({ planStatus, planExpiresAt, freeTransactionCount }: Props) {
	const { data: config } = useAppConfig();
	const historyQuery = usePaymentHistory();
	const history = (historyQuery.data ?? []).filter((log) => log.status in PAYMENT_EVENT_LABELS);
	const active = hasActivePlan({ planStatus, planExpiresAt });

	return (
		<div className="mt-6 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
			<h2 className="text-lg font-semibold">Plano</h2>

			{active ? (
				<p className="mt-3 text-sm text-(--color-fg-muted)">
					Plano <strong className="text-(--color-fg)">PRO</strong> ativo até{" "}
					{planExpiresAt ? new Date(planExpiresAt).toLocaleDateString("pt-BR") : "—"}.
				</p>
			) : (
				<>
					<p className="mt-2 text-sm text-(--color-fg-muted)">
						Plano atual: <strong className="text-(--color-fg)">Gratuito</strong> — {freeTransactionCount}/
						{FREE_TRANSACTION_LIMIT} transações utilizadas.
					</p>
					{freeTransactionCount >= FREE_TRANSACTION_LIMIT && (
						<p className="mt-2 text-sm text-red-500">
							Limite de transações gratuitas atingido — assine um plano para liberar acesso ilimitado.
						</p>
					)}
					{(config?.enableAbacatepay || config?.abacatepayPixTestMode) && (
						<Link
							to="/checkout"
							className="mt-4 inline-block rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-400"
						>
							Assinar Plano
						</Link>
					)}
				</>
			)}

			{history.length > 0 && (
				<div className="mt-5 border-t border-(--color-border) pt-4">
					<AccordionCard title="Histórico de pagamentos">
						<ul className="flex flex-col gap-2">
							{history.map((log) => (
								<li
									key={log.id}
									className="flex items-center justify-between text-sm text-(--color-fg-muted)"
								>
									<span>
										{PAYMENT_EVENT_LABELS[log.status]}
										{log.amount != null
											? ` — ${(log.amount / 100).toFixed(2)} ${(log.currency ?? "").toUpperCase()}`
											: ""}
									</span>
									<span>{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
								</li>
							))}
						</ul>
					</AccordionCard>
				</div>
			)}
		</div>
	);
}
