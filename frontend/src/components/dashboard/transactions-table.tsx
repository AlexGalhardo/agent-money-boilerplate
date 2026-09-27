import { Pencil, Trash2 } from "lucide-react";
import { categoryLabels, formatCurrencyCents, getCategoryColor } from "../../lib/categories";
import { CategoryIcon } from "../../lib/category-icons";
import type { Transaction } from "../../lib/queries";
import { useIsDarkTheme } from "../theme-toggle";

// Bank-statement imports carry much longer descriptions than typed ones —
// past this length they render smaller to keep rows readable.
const LONG_DESCRIPTION_LENGTH = 60;

type Props = {
	transactions: Transaction[];
	loading: boolean;
	onEdit: (transaction: Transaction) => void;
	onDelete: (transaction: Transaction) => void;
};

function EmptyRow({ children }: { children: string }) {
	return (
		<tr>
			<td colSpan={4} className="px-4 py-8 text-center text-(--color-fg-muted)">
				{children}
			</td>
		</tr>
	);
}

export function TransactionsTable({ transactions, loading, onEdit, onDelete }: Props) {
	const isDark = useIsDarkTheme();

	return (
		<div className="mt-4 overflow-x-auto rounded-xl border border-(--color-border)">
			<table className="w-full min-w-[560px] text-left text-sm">
				<thead className="border-b border-(--color-border) text-(--color-fg-muted)">
					<tr>
						<th className="px-4 py-3 font-medium">Descrição</th>
						<th className="px-4 py-3 font-medium">Data</th>
						<th className="min-w-[110px] px-4 py-3 text-right font-medium">Valor</th>
						<th className="px-4 py-3 text-right font-medium">Ações</th>
					</tr>
				</thead>
				<tbody>
					{loading && <EmptyRow>Carregando...</EmptyRow>}
					{!loading && transactions.length === 0 && <EmptyRow>Nenhuma transação encontrada.</EmptyRow>}

					{transactions.map((transaction) => (
						<tr key={transaction.id} className="border-b border-(--color-border) last:border-0">
							<td className="px-4 py-3">
								<span className="flex items-center gap-2">
									<CategoryIcon
										category={transaction.category}
										className="size-4 shrink-0"
										style={{
											color: getCategoryColor(transaction.category, transaction.type, isDark),
										}}
									/>
									<span
										title={categoryLabels[transaction.category] ?? transaction.category}
										className={
											transaction.description.length >= LONG_DESCRIPTION_LENGTH ? "text-xs" : ""
										}
									>
										{transaction.description}
									</span>
								</span>
							</td>
							<td className="px-4 py-3 text-(--color-fg-muted)">
								{new Date(transaction.date).toLocaleDateString("pt-BR")}
							</td>
							<td
								className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${
									transaction.type === "income" ? "text-emerald-600" : "text-red-500"
								}`}
							>
								{transaction.type === "income" ? "+" : "−"} {formatCurrencyCents(transaction.amount)}
							</td>
							<td className="px-4 py-3 text-right">
								<div className="flex justify-end gap-2">
									<button
										type="button"
										onClick={() => onEdit(transaction)}
										aria-label="Editar"
										title="Editar"
										className="rounded-lg border border-orange-500/40 p-1.5 text-orange-600 hover:bg-orange-500/10"
									>
										<Pencil className="size-4" aria-hidden="true" />
									</button>
									<button
										type="button"
										onClick={() => onDelete(transaction)}
										aria-label="Excluir"
										title="Excluir"
										className="rounded-lg border border-red-500/40 p-1.5 text-red-500 hover:bg-red-500/10"
									>
										<Trash2 className="size-4" aria-hidden="true" />
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function Pagination({
	page,
	totalPages,
	onChange,
}: {
	page: number;
	totalPages: number;
	onChange: (page: number) => void;
}) {
	if (totalPages <= 1) return null;

	return (
		<div className="mt-4 flex items-center justify-center gap-3 text-sm">
			<button
				type="button"
				disabled={page <= 1}
				onClick={() => onChange(page - 1)}
				className="rounded-lg border border-(--color-border) px-3 py-1.5 disabled:opacity-40"
			>
				Anterior
			</button>
			<span className="text-(--color-fg-muted)">
				Página {page} de {totalPages}
			</span>
			<button
				type="button"
				disabled={page >= totalPages}
				onClick={() => onChange(page + 1)}
				className="rounded-lg border border-(--color-border) px-3 py-1.5 disabled:opacity-40"
			>
				Próxima
			</button>
		</div>
	);
}
