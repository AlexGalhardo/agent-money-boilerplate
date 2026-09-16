import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import { AccordionCard } from "../../components/accordion-card";
import { BalanceCard } from "../../components/balance-card";
import { CategoryPieChart } from "../../components/category-pie-chart";
import { CategorySelect } from "../../components/category-select";
import { ImportTransactionsModal } from "../../components/import-transactions-modal";
import { Modal } from "../../components/modal";
import { PageLayout } from "../../components/page-layout";
import type { TransactionFormInitial, TransactionFormSubmitValues } from "../../components/transaction-form";
import { TransactionForm } from "../../components/transaction-form";
import { UserMenu } from "../../components/user-menu";
import { api } from "../../lib/api";
import { useSession } from "../../lib/auth-client";
import type { TransactionCategory } from "../../lib/categories";
import {
	categoryLabels,
	categoryOptions,
	expenseCategoryColor,
	formatCurrencyCents,
	incomeCategoryColor,
} from "../../lib/categories";
import { CategoryIcon } from "../../lib/category-icons";
import { exportTransactionsToCsv, exportTransactionsToXlsx } from "../../lib/export-transactions";
import { FREE_TRANSACTION_LIMIT, hasActivePlan } from "../../lib/plan";
import { requireAuth } from "../../lib/require-auth";

export const Route = createFileRoute("/dashboard/")({
	head: () => ({ meta: [{ title: "Money" }] }),
	beforeLoad: requireAuth,
	component: DashboardPage,
});

type Transaction = {
	id: string;
	description: string;
	amount: number;
	category: TransactionCategory;
	type: "income" | "expense";
	date: string;
	createdAt: string;
	updatedAt: string | null;
};

const PER_PAGE = 10;
// Busca por nome é feita no cliente (fuse.js), então o servidor precisa devolver
// o conjunto inteiro que já passou pelos filtros de categoria/data — não apenas
// uma página — para a busca e a paginação no cliente funcionarem sobre tudo.
const FETCH_ALL_PER_PAGE = 1000;

function DashboardPage() {
	const queryClient = useQueryClient();
	const { data: session } = useSession();

	const [search, setSearch] = useState("");
	const [category, setCategory] = useState<TransactionCategory | "">("");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [page, setPage] = useState(1);

	const [addType, setAddType] = useState<"income" | "expense" | null>(null);
	const [importOpen, setImportOpen] = useState(false);
	const [editing, setEditing] = useState<Transaction | null>(null);
	const [deleting, setDeleting] = useState<Transaction | null>(null);
	const [formError, setFormError] = useState<string | null>(null);

	const serverFilters = {
		...(category ? { category } : {}),
		...(from ? { from: new Date(from).toISOString() } : {}),
		...(to ? { to: new Date(to).toISOString() } : {}),
		page: 1,
		perPage: FETCH_ALL_PER_PAGE,
	};

	const transactionsQuery = useQuery({
		queryKey: ["transactions", serverFilters],
		queryFn: async () => {
			const { data, error } = await api.transactions.get({ query: serverFilters });
			if (error || !("transactions" in data)) throw error ?? new Error("Falha ao carregar transações");
			return data.transactions as Transaction[];
		},
	});

	const statsQuery = useQuery({
		queryKey: ["transactions-statistics"],
		queryFn: async () => {
			const { data, error } = await api.transactions.statistics.get();
			if (error || !("stats" in data)) throw error ?? new Error("Falha ao carregar estatísticas");
			return data.stats;
		},
	});

	const meQuery = useQuery({
		queryKey: ["me"],
		queryFn: async () => {
			const { data, error } = await api.users.me.get();
			if (error || !data || !("user" in data)) throw error ?? new Error("Falha ao carregar dados da conta");
			return data.user;
		},
	});

	const freeLimitReached = Boolean(
		meQuery.data && !hasActivePlan(meQuery.data) && meQuery.data.freeTransactionCount >= FREE_TRANSACTION_LIMIT,
	);

	function invalidateAll(): void {
		queryClient.invalidateQueries({ queryKey: ["transactions"] });
		queryClient.invalidateQueries({ queryKey: ["transactions-statistics"] });
		queryClient.invalidateQueries({ queryKey: ["me"] });
	}

	const createMutation = useMutation({
		mutationFn: async (values: TransactionFormSubmitValues) => {
			const { error } = await api.transactions.post(values);
			if (error) throw error;
		},
		onSuccess: () => {
			setAddType(null);
			setFormError(null);
			invalidateAll();
		},
		onError: (error: unknown) => setFormError(errorMessage(error)),
	});

	const updateMutation = useMutation({
		mutationFn: async (values: TransactionFormSubmitValues) => {
			if (!editing) return;
			const { error } = await api.transactions({ id: editing.id }).put(values);
			if (error) throw error;
		},
		onSuccess: () => {
			setEditing(null);
			setFormError(null);
			invalidateAll();
		},
		onError: (error: unknown) => setFormError(errorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: async () => {
			if (!deleting) return;
			const { error } = await api.transactions({ id: deleting.id }).delete();
			if (error) throw error;
		},
		onSuccess: () => {
			setDeleting(null);
			invalidateAll();
		},
	});

	const allTransactions = transactionsQuery.data ?? [];

	const fuse = useMemo(() => new Fuse(allTransactions, { keys: ["description"], threshold: 0.3 }), [allTransactions]);

	const searched =
		search.trim().length >= 3 ? fuse.search(search.trim()).map((result) => result.item) : allTransactions;

	const searchedIncomeTotal = searched
		.filter((transaction) => transaction.type === "income")
		.reduce((sum, transaction) => sum + transaction.amount, 0);
	const searchedExpenseTotal = searched
		.filter((transaction) => transaction.type === "expense")
		.reduce((sum, transaction) => sum + transaction.amount, 0);

	const total = searched.length;
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	const currentPage = Math.min(page, totalPages);
	const transactions = searched.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

	const expenseData = (statsQuery.data ?? [])
		.filter((row) => row.type === "expense")
		.map((row) => ({ category: row.category, total: row.total, percentage: row.percentage }));
	const incomeData = (statsQuery.data ?? [])
		.filter((row) => row.type === "income")
		.map((row) => ({ category: row.category, total: row.total, percentage: row.percentage }));
	const incomeTotal = incomeData.reduce((sum, row) => sum + row.total, 0);
	const expenseTotal = expenseData.reduce((sum, row) => sum + row.total, 0);

	function toInitial(transaction: Transaction): TransactionFormInitial {
		return {
			description: transaction.description,
			amount: transaction.amount,
			category: transaction.category,
			type: transaction.type,
			date: transaction.date,
		};
	}

	function resetPage(): void {
		setPage(1);
	}

	return (
		<PageLayout
			headerActions={
				<>
					<button
						type="button"
						disabled={freeLimitReached}
						onClick={() => setImportOpen(true)}
						className="rounded-lg bg-[#820AD1] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#9a1df0] disabled:opacity-40"
					>
						Importar
					</button>
					<button
						type="button"
						disabled={freeLimitReached}
						onClick={() => setAddType("income")}
						className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-40"
					>
						Adicionar Receita
					</button>
					<button
						type="button"
						disabled={freeLimitReached}
						onClick={() => setAddType("expense")}
						className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-40"
					>
						Adicionar Despesa
					</button>
					<UserMenu name={session?.user.name ?? "Conta"} />
				</>
			}
		>
			<section className="mx-auto max-w-6xl px-4 py-10">
				{freeLimitReached && (
					<p className="text-sm text-red-500">
						Limite de {FREE_TRANSACTION_LIMIT} transações do plano gratuito atingido —{" "}
						<a href="/minha-conta" className="underline">
							assine um plano
						</a>{" "}
						para continuar adicionando, importando ou exportando transações.
					</p>
				)}

				<div className={`grid gap-6 lg:grid-cols-[320px_1fr] ${freeLimitReached ? "mt-3" : ""}`}>
					<div className="flex flex-col gap-6">
						<BalanceCard incomeTotal={incomeTotal} expenseTotal={expenseTotal} />
						<AccordionCard title="Despesas por categoria" defaultOpen>
							<CategoryPieChart
								data={expenseData}
								colors={expenseCategoryColor}
								emptyLabel="Nenhuma despesa registrada ainda."
							/>
						</AccordionCard>
						<AccordionCard title="Receitas por categoria" defaultOpen>
							<CategoryPieChart
								data={incomeData}
								colors={incomeCategoryColor}
								emptyLabel="Nenhuma receita registrada ainda."
							/>
						</AccordionCard>
					</div>

					<div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<h2 className="font-semibold">Transações</h2>
							<div className="flex gap-2">
								<button
									type="button"
									disabled={allTransactions.length === 0 || freeLimitReached}
									onClick={() => exportTransactionsToXlsx(searched)}
									className="rounded-lg border border-(--color-border) px-3 py-1.5 text-xs font-medium hover:bg-brand-500/10 disabled:opacity-40"
								>
									Exportar .xlsx
								</button>
								<button
									type="button"
									disabled={allTransactions.length === 0 || freeLimitReached}
									onClick={() => exportTransactionsToCsv(searched)}
									className="rounded-lg border border-(--color-border) px-3 py-1.5 text-xs font-medium hover:bg-brand-500/10 disabled:opacity-40"
								>
									Exportar .csv
								</button>
							</div>
						</div>

						<div className="mt-4 flex flex-col gap-1">
							<label htmlFor="search" className="text-xs font-medium text-(--color-fg-muted)">
								Buscar por nome
							</label>
							<input
								id="search"
								type="text"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									resetPage();
								}}
								placeholder="Digite pelo menos 3 caracteres..."
								className="w-full rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-1.5 text-sm outline-none focus:border-brand-500"
							/>
						</div>

						{search.trim().length >= 3 && (
							<div className="mt-3 flex w-full items-center justify-between gap-4 rounded-lg border border-(--color-border) bg-(--color-bg-subtle) px-3 py-2 text-sm">
								<span className="text-(--color-fg-muted)">
									{searched.length} resultado{searched.length === 1 ? "" : "s"} para "{search.trim()}"
								</span>
								<span className="flex gap-4 tabular-nums">
									<span className="text-emerald-600">
										+ {formatCurrencyCents(searchedIncomeTotal)}
									</span>
									<span className="text-red-500">− {formatCurrencyCents(searchedExpenseTotal)}</span>
								</span>
							</div>
						)}

						<div className="mt-3 flex flex-wrap items-end justify-between gap-3">
							<div className="flex flex-col gap-1">
								<label
									htmlFor="category-filter"
									className="text-xs font-medium text-(--color-fg-muted)"
								>
									Categoria
								</label>
								<CategorySelect
									id="category-filter"
									value={category}
									options={categoryOptions}
									placeholder="Todas"
									onChange={(value) => {
										setCategory(value);
										resetPage();
									}}
								/>
							</div>

							<div className="flex flex-col gap-1">
								<label htmlFor="from" className="text-xs font-medium text-(--color-fg-muted)">
									De
								</label>
								<input
									id="from"
									type="date"
									value={from}
									onChange={(event) => {
										setFrom(event.target.value);
										resetPage();
									}}
									className="rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-1.5 text-sm outline-none focus:border-brand-500"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<label htmlFor="to" className="text-xs font-medium text-(--color-fg-muted)">
									Até
								</label>
								<input
									id="to"
									type="date"
									value={to}
									onChange={(event) => {
										setTo(event.target.value);
										resetPage();
									}}
									className="rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-1.5 text-sm outline-none focus:border-brand-500"
								/>
							</div>
						</div>

						<div className="mt-4 overflow-x-auto rounded-xl border border-(--color-border)">
							<table className="w-full min-w-[560px] text-left text-sm">
								<thead className="border-b border-(--color-border) text-(--color-fg-muted)">
									<tr>
										<th className="px-4 py-3 font-medium">Descrição</th>
										<th className="px-4 py-3 font-medium">Categoria</th>
										<th className="px-4 py-3 font-medium">Data</th>
										<th className="px-4 py-3 text-right font-medium">Valor</th>
										<th className="px-4 py-3 text-right font-medium">Ações</th>
									</tr>
								</thead>
								<tbody>
									{transactionsQuery.isLoading && (
										<tr>
											<td colSpan={5} className="px-4 py-8 text-center text-(--color-fg-muted)">
												Carregando...
											</td>
										</tr>
									)}

									{!transactionsQuery.isLoading && transactions.length === 0 && (
										<tr>
											<td colSpan={5} className="px-4 py-8 text-center text-(--color-fg-muted)">
												Nenhuma transação encontrada.
											</td>
										</tr>
									)}

									{transactions.map((transaction) => (
										<tr
											key={transaction.id}
											className="border-b border-(--color-border) last:border-0"
										>
											<td className="px-4 py-3">{transaction.description}</td>
											<td className="px-4 py-3">
												<span
													title={categoryLabels[transaction.category] ?? transaction.category}
												>
													<CategoryIcon
														category={transaction.category}
														className="size-5 text-(--color-fg-muted)"
													/>
													<span className="sr-only">
														{categoryLabels[transaction.category] ?? transaction.category}
													</span>
												</span>
											</td>
											<td className="px-4 py-3 text-(--color-fg-muted)">
												{new Date(transaction.date).toLocaleDateString("pt-BR")}
											</td>
											<td
												className={`px-4 py-3 text-right tabular-nums ${
													transaction.type === "income" ? "text-emerald-600" : "text-red-500"
												}`}
											>
												{transaction.type === "income" ? "+" : "−"}{" "}
												{formatCurrencyCents(transaction.amount)}
											</td>
											<td className="px-4 py-3 text-right">
												<div className="flex justify-end gap-2">
													<button
														type="button"
														onClick={() => setEditing(transaction)}
														className="rounded-lg border border-(--color-border) px-2.5 py-1 text-xs font-medium hover:bg-brand-500/10"
													>
														Editar
													</button>
													<button
														type="button"
														onClick={() => setDeleting(transaction)}
														className="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10"
													>
														Excluir
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{totalPages > 1 && (
							<div className="mt-4 flex items-center justify-center gap-3 text-sm">
								<button
									type="button"
									disabled={currentPage <= 1}
									onClick={() => setPage((current) => Math.max(1, current - 1))}
									className="rounded-lg border border-(--color-border) px-3 py-1.5 disabled:opacity-40"
								>
									Anterior
								</button>
								<span className="text-(--color-fg-muted)">
									Página {currentPage} de {totalPages}
								</span>
								<button
									type="button"
									disabled={currentPage >= totalPages}
									onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
									className="rounded-lg border border-(--color-border) px-3 py-1.5 disabled:opacity-40"
								>
									Próxima
								</button>
							</div>
						)}
					</div>
				</div>
			</section>

			{importOpen && <ImportTransactionsModal onClose={() => setImportOpen(false)} onImported={invalidateAll} />}

			{addType && (
				<Modal
					title={addType === "income" ? "Adicionar Receita" : "Adicionar Despesa"}
					onClose={() => {
						setAddType(null);
						setFormError(null);
					}}
				>
					{formError && <p className="mb-3 text-sm text-red-500">{formError}</p>}
					<TransactionForm
						fixedType={addType}
						submitLabel="Criar transação"
						loading={createMutation.isPending}
						onSubmit={(values) => createMutation.mutate(values)}
					/>
				</Modal>
			)}

			{editing && (
				<Modal
					title="Editar transação"
					onClose={() => {
						setEditing(null);
						setFormError(null);
					}}
				>
					{formError && <p className="mb-3 text-sm text-red-500">{formError}</p>}
					<TransactionForm
						initial={toInitial(editing)}
						submitLabel="Salvar alterações"
						loading={updateMutation.isPending}
						onSubmit={(values) => updateMutation.mutate(values)}
					/>
				</Modal>
			)}

			{deleting && (
				<Modal title="Excluir transação" onClose={() => setDeleting(null)}>
					<p className="text-sm text-(--color-fg-muted)">
						Tem certeza que deseja excluir{" "}
						<strong className="text-(--color-fg)">{deleting.description}</strong>? Essa ação não pode ser
						desfeita.
					</p>
					<div className="mt-4 flex gap-3">
						<button
							type="button"
							onClick={() => deleteMutation.mutate()}
							disabled={deleteMutation.isPending}
							className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
						>
							{deleteMutation.isPending ? "Excluindo..." : "Confirmar exclusão"}
						</button>
						<button
							type="button"
							onClick={() => setDeleting(null)}
							className="rounded-lg border border-(--color-border) px-4 py-2 text-sm font-semibold"
						>
							Cancelar
						</button>
					</div>
				</Modal>
			)}
		</PageLayout>
	);
}

function errorMessage(error: unknown): string {
	if (error && typeof error === "object" && "value" in error) {
		const value = (error as { value?: unknown }).value;
		if (value && typeof value === "object" && "message" in value) {
			return String((value as { message: unknown }).message);
		}
	}
	return "Não foi possível salvar a transação";
}
