import { formatCurrencyCents } from "../lib/categories";

export function BalanceCard({ incomeTotal, expenseTotal }: { incomeTotal: number; expenseTotal: number }) {
	const balance = incomeTotal - expenseTotal;

	return (
		<div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
			<h2 className="text-lg font-semibold">Saldo atual</h2>
			<p className={`mt-2 text-3xl font-bold tabular-nums ${balance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
				{formatCurrencyCents(balance)}
			</p>
			<div className="mt-4 flex gap-6 text-sm">
				<p className="text-(--color-fg-muted)">
					Receitas: <span className="font-medium text-emerald-600">{formatCurrencyCents(incomeTotal)}</span>
				</p>
				<p className="text-(--color-fg-muted)">
					Despesas: <span className="font-medium text-red-500">{formatCurrencyCents(expenseTotal)}</span>
				</p>
			</div>
		</div>
	);
}
