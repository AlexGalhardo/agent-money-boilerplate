import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AccordionCard } from "../../components/accordion-card";
import { BalanceCard } from "../../components/balance-card";
import { CategoryPieChart } from "../../components/category-pie-chart";
import { DashboardActions } from "../../components/dashboard/dashboard-actions";
import { DeleteTransactionModal } from "../../components/dashboard/delete-transaction-modal";
import { ExportButtons } from "../../components/dashboard/export-buttons";
import type { TransactionFilterValues } from "../../components/dashboard/transaction-filters";
import { TransactionFilters } from "../../components/dashboard/transaction-filters";
import { Pagination, TransactionsTable } from "../../components/dashboard/transactions-table";
import { ImportTransactionsModal } from "../../components/import-transactions-modal";
import { Modal } from "../../components/modal";
import { PageLayout } from "../../components/page-layout";
import type { TransactionFormSubmitValues } from "../../components/transaction-form";
import { TransactionForm } from "../../components/transaction-form";
import { api } from "../../lib/api";
import { apiErrorMessage } from "../../lib/api-error";
import { useSession } from "../../lib/auth-client";
import type { TransactionCategory } from "../../lib/categories";
import { expenseCategories, expenseCategoryColor, incomeCategories, incomeCategoryColor } from "../../lib/categories";
import { exportSummaryToPdf } from "../../lib/export-summary-pdf";
import { exportTransactionsToCsv, exportTransactionsToXlsx } from "../../lib/export-transactions";
import { FREE_TRANSACTION_LIMIT, hasActivePlan, planDaysRemaining } from "../../lib/plan";
import type { Transaction } from "../../lib/queries";
import { useInvalidateFinanceData, useMeQuery, useStatisticsQuery, useTransactionsQuery } from "../../lib/queries";
import { requireAuth } from "../../lib/require-auth";
import { MIN_SEARCH_LENGTH, paginate, searchTransactions, sumByType } from "../../lib/transaction-search";

export const Route = createFileRoute("/dashboard/")({
	head: () => ({ meta: [{ title: "Money" }] }),
	beforeLoad: requireAuth,
	component: DashboardPage,
});

const PER_PAGE = 10;
const SAVE_ERROR = "Não foi possível salvar a transação";

type StatRow = { category: string; type: "income" | "expense"; total: number; percentage: number };

function chartData(stats: StatRow[], type: "income" | "expense", categories: TransactionCategory[]) {
	return stats
		.filter((row) => row.type === type && categories.includes(row.category as TransactionCategory))
		.map(({ category, total, percentage }) => ({ category, total, percentage }));
}

function DashboardPage() {
	const { data: session } = useSession();
	const invalidateFinanceData = useInvalidateFinanceData();

	const [filters, setFilters] = useState<TransactionFilterValues>({ search: "", category: "", from: "", to: "" });
	const [page, setPage] = useState(1);
	const [addType, setAddType] = useState<"income" | "expense" | null>(null);
	const [importOpen, setImportOpen] = useState(false);
	const [editing, setEditing] = useState<Transaction | null>(null);
	const [deleting, setDeleting] = useState<Transaction | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [exportingPdf, setExportingPdf] = useState(false);
	const summaryCardsRef = useRef<HTMLDivElement>(null);

	const transactionsQuery = useTransactionsQuery({
		...(filters.category ? { category: filters.category } : {}),
		...(filters.from ? { from: new Date(filters.from).toISOString() } : {}),
		...(filters.to ? { to: new Date(filters.to).toISOString() } : {}),
	});
	const statsQuery = useStatisticsQuery();
	const meQuery = useMeQuery();

	const me = meQuery.data;
	const freeLimitReached = Boolean(me && !hasActivePlan(me) && me.freeTransactionCount >= FREE_TRANSACTION_LIMIT);
	const daysRemaining = me ? planDaysRemaining(me) : null;

	const allTransactions = transactionsQuery.data ?? [];
	const searched = searchTransactions(allTransactions, filters.search);
	const visible = paginate(searched, page, PER_PAGE);
	const isSearching = filters.search.trim().length >= MIN_SEARCH_LENGTH;

	const stats = statsQuery.data ?? [];
	const expenseData = chartData(stats, "expense", expenseCategories);
	const incomeData = chartData(stats, "income", incomeCategories);

	function closeForm(): void {
		setAddType(null);
		setEditing(null);
		setFormError(null);
	}

	const saveMutation = useMutation({
		mutationFn: async ({ id, values }: { id?: string; values: TransactionFormSubmitValues }) => {
			const { error } = id ? await api.transactions({ id }).put(values) : await api.transactions.post(values);
			if (error) throw error;
		},
		onSuccess: () => {
			closeForm();
			invalidateFinanceData();
		},
		onError: (error: unknown) => setFormError(apiErrorMessage(error, SAVE_ERROR)),
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const { error } = await api.transactions({ id }).delete();
			if (error) throw error;
		},
		onSuccess: () => {
			setDeleting(null);
			invalidateFinanceData();
		},
	});

	async function handleExportSummaryPdf(): Promise<void> {
		if (!summaryCardsRef.current) return;
		setExportingPdf(true);
		try {
			await exportSummaryToPdf(summaryCardsRef.current);
		} finally {
			setExportingPdf(false);
		}
	}

	return (
		<PageLayout
			headerTitleBadge={
				daysRemaining !== null && (
					<span className="rounded-md bg-orange-700 px-2.5 py-0.5 text-xs font-bold text-white uppercase shadow-[0_0_8px_rgba(194,65,12,0.4)]">
						PRO por mais {daysRemaining} dia{daysRemaining === 1 ? "" : "s"}
					</span>
				)
			}
			headerActions={
				<DashboardActions
					disabled={freeLimitReached}
					userName={session?.user.name ?? "Conta"}
					onImport={() => setImportOpen(true)}
					onAdd={setAddType}
				/>
			}
		>
			<section className="mx-auto max-w-7xl px-4 py-10">
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
					<div ref={summaryCardsRef} className="flex flex-col gap-6">
						<BalanceCard
							incomeTotal={incomeData.reduce((sum, row) => sum + row.total, 0)}
							expenseTotal={expenseData.reduce((sum, row) => sum + row.total, 0)}
						/>
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
							<ExportButtons
								disabled={allTransactions.length === 0 || freeLimitReached}
								exportingPdf={exportingPdf}
								onXlsx={() => exportTransactionsToXlsx(searched)}
								onCsv={() => exportTransactionsToCsv(searched)}
								onPdf={handleExportSummaryPdf}
							/>
						</div>

						<TransactionFilters
							values={filters}
							onChange={(next) => {
								setFilters(next);
								setPage(1);
							}}
							searchSummary={
								isSearching
									? {
											count: searched.length,
											income: sumByType(searched, "income"),
											expense: sumByType(searched, "expense"),
										}
									: null
							}
						/>

						<TransactionsTable
							transactions={visible.items}
							loading={transactionsQuery.isLoading}
							onEdit={setEditing}
							onDelete={setDeleting}
						/>
						<Pagination page={visible.page} totalPages={visible.totalPages} onChange={setPage} />
					</div>
				</div>
			</section>

			{importOpen && (
				<ImportTransactionsModal onClose={() => setImportOpen(false)} onImported={invalidateFinanceData} />
			)}

			{(addType || editing) && (
				<Modal
					title={
						editing ? "Editar transação" : addType === "income" ? "Adicionar Receita" : "Adicionar Despesa"
					}
					onClose={closeForm}
				>
					{formError && <p className="mb-3 text-sm text-red-500">{formError}</p>}
					<TransactionForm
						key={editing?.id ?? addType}
						{...(editing
							? {
									initial: {
										description: editing.description,
										amount: editing.amount,
										category: editing.category,
										type: editing.type,
										date: editing.date,
									},
								}
							: { fixedType: addType ?? "expense" })}
						submitLabel={editing ? "Salvar alterações" : "Criar transação"}
						loading={saveMutation.isPending}
						onSubmit={(values) => saveMutation.mutate({ id: editing?.id, values })}
					/>
				</Modal>
			)}

			{deleting && (
				<DeleteTransactionModal
					description={deleting.description}
					pending={deleteMutation.isPending}
					onConfirm={() => deleteMutation.mutate(deleting.id)}
					onClose={() => setDeleting(null)}
				/>
			)}
		</PageLayout>
	);
}
