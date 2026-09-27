import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api } from "../lib/api";
import { apiErrorMessage } from "../lib/api-error";
import type { TransactionCategory } from "../lib/categories";
import { categoryLabels, categoryOptions, formatCurrencyCents } from "../lib/categories";
import { inputClassName } from "./auth-card";
import { Modal } from "./modal";

type PreviewRow = {
	rowNumber: number;
	createdAt: string;
	description: string;
	amount: number;
	type: "income" | "expense";
	category: TransactionCategory;
	needsReview: boolean;
};

type PreviewSummary = { total: number; needsReview: number; income: number; expense: number };

export function ImportTransactionsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [rows, setRows] = useState<PreviewRow[] | null>(null);
	const [summary, setSummary] = useState<PreviewSummary | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<{ created: number; skippedDuplicates: number } | null>(null);

	const previewMutation = useMutation({
		mutationFn: async (csv: string) => {
			const { data, error: reqError } = await api.transactions.import.preview.post({ csv });
			if (reqError || !data || !("rows" in data)) {
				throw new Error(apiErrorMessage(reqError, "Não foi possível ler o arquivo CSV"));
			}
			return data;
		},
		onSuccess: (data) => {
			setRows(data.rows as PreviewRow[]);
			setSummary(data.summary);
			setError(null);
		},
		onError: (err: unknown) => {
			setError(err instanceof Error ? err.message : "Não foi possível ler o arquivo CSV");
			setRows(null);
			setSummary(null);
		},
	});

	const confirmMutation = useMutation({
		mutationFn: async () => {
			if (!rows) return;
			const { data, error: reqError } = await api.transactions.import.confirm.post({
				transactions: rows.map((row) => ({
					description: row.description,
					amount: row.amount,
					category: row.category,
					type: row.type,
					createdAt: row.createdAt,
				})),
			});
			if (reqError || !data || !("created" in data)) {
				throw new Error(apiErrorMessage(reqError, "Não foi possível importar as transações"));
			}
			return data;
		},
		onSuccess: (data) => {
			if (!data) return;
			setResult(data);
			onImported();
		},
		onError: (err: unknown) => {
			setError(err instanceof Error ? err.message : "Não foi possível importar as transações");
		},
	});

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
		const file = event.target.files?.[0];
		if (!file) return;
		setFileName(file.name);
		setResult(null);

		const reader = new FileReader();
		reader.onload = () => {
			const csv = typeof reader.result === "string" ? reader.result : "";
			previewMutation.mutate(csv);
		};
		reader.onerror = () => setError("Não foi possível ler o arquivo selecionado");
		reader.readAsText(file, "utf-8");
	}

	function updateRowCategory(rowNumber: number, category: TransactionCategory): void {
		setRows((current) =>
			current ? current.map((row) => (row.rowNumber === rowNumber ? { ...row, category } : row)) : current,
		);
	}

	const needsReviewRows = rows?.filter((row) => row.needsReview) ?? [];

	return (
		<Modal title="Importar transações do Nubank" onClose={onClose} maxWidth="max-w-4xl">
			<div className="flex flex-col gap-4">
				{!rows && !result && (
					<>
						<p className="text-sm text-(--color-fg-muted)">
							Selecione o arquivo .csv exportado do extrato do Nubank (colunas Data, Valor, Identificador,
							Descrição). Valores negativos viram despesas e positivos viram receitas.
						</p>
						<input
							ref={fileInputRef}
							type="file"
							accept=".csv,text/csv"
							onChange={handleFileChange}
							className="sr-only"
						/>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="flex w-fit items-center gap-2 rounded-lg bg-[#820AD1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9a1df0]"
						>
							Importar Nubank CSV
						</button>
						{fileName && !previewMutation.isPending && !rows && (
							<p className="text-sm text-(--color-fg-muted)">Arquivo selecionado: {fileName}</p>
						)}
						{fileName && previewMutation.isPending && (
							<p className="text-sm text-(--color-fg-muted)">Lendo {fileName}...</p>
						)}
					</>
				)}

				{error && <p className="text-sm text-red-500">{error}</p>}

				{rows && summary && !result && (
					<>
						<div className="grid grid-cols-2 gap-2 rounded-lg border border-(--color-border) p-3 text-sm sm:grid-cols-4">
							<Stat label="Total" value={summary.total} />
							<Stat label="Receitas" value={summary.income} />
							<Stat label="Despesas" value={summary.expense} />
							<Stat
								label="Revisar categoria"
								value={summary.needsReview}
								highlight={summary.needsReview > 0}
							/>
						</div>

						{needsReviewRows.length > 0 && (
							<p className="text-sm text-amber-500">
								Não consegui identificar a categoria de {needsReviewRows.length}{" "}
								{needsReviewRows.length === 1 ? "transação" : "transações"} automaticamente. Revise e
								escolha a categoria correta abaixo antes de confirmar.
							</p>
						)}

						<div className="max-h-80 overflow-y-auto rounded-lg border border-(--color-border)">
							<table className="w-full text-left text-sm">
								<thead className="sticky top-0 border-b border-(--color-border) bg-(--color-surface) text-(--color-fg-muted)">
									<tr>
										<th className="px-3 py-2 font-medium">Descrição</th>
										<th className="px-3 py-2 font-medium">Data</th>
										<th className="px-3 py-2 text-right font-medium">Valor</th>
										<th className="px-3 py-2 font-medium">Categoria</th>
									</tr>
								</thead>
								<tbody>
									{rows.map((row) => (
										<tr
											key={row.rowNumber}
											className={`border-b border-(--color-border) last:border-0 ${row.needsReview ? "bg-amber-500/5" : ""}`}
										>
											<td className="max-w-64 truncate px-3 py-2" title={row.description}>
												{row.description}
											</td>
											<td className="px-3 py-2 whitespace-nowrap text-(--color-fg-muted)">
												{new Date(row.createdAt).toLocaleDateString("pt-BR")}
											</td>
											<td
												className={`px-3 py-2 text-right whitespace-nowrap tabular-nums ${row.type === "income" ? "text-emerald-600" : "text-red-500"}`}
											>
												{row.type === "income" ? "+" : "-"}
												{formatCurrencyCents(row.amount)}
											</td>
											<td className="px-3 py-2">
												{row.needsReview ? (
													<select
														value={row.category}
														onChange={(event) =>
															updateRowCategory(
																row.rowNumber,
																event.target.value as TransactionCategory,
															)
														}
														className={`${inputClassName} py-1 text-xs`}
													>
														{categoryOptions.map((option) => (
															<option key={option} value={option}>
																{categoryLabels[option]}
															</option>
														))}
													</select>
												) : (
													<span className="text-xs">{categoryLabels[row.category]}</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => confirmMutation.mutate()}
								disabled={confirmMutation.isPending}
								className="rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-black hover:bg-brand-400 disabled:opacity-60"
							>
								{confirmMutation.isPending ? "Importando..." : `Confirmar importação (${rows.length})`}
							</button>
							<button
								type="button"
								onClick={() => {
									setRows(null);
									setSummary(null);
									setFileName(null);
									if (fileInputRef.current) fileInputRef.current.value = "";
								}}
								className="rounded-lg border border-(--color-border) px-4 py-2.5 text-sm font-semibold"
							>
								Escolher outro arquivo
							</button>
						</div>
					</>
				)}

				{result && (
					<div className="flex flex-col gap-3">
						<p className="text-sm">
							{result.created} {result.created === 1 ? "transação importada" : "transações importadas"}{" "}
							com sucesso.
							{result.skippedDuplicates > 0 &&
								` ${result.skippedDuplicates} ${result.skippedDuplicates === 1 ? "já existia" : "já existiam"} e ${result.skippedDuplicates === 1 ? "foi ignorada" : "foram ignoradas"}.`}
						</p>
						<button
							type="button"
							onClick={onClose}
							className="rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-black hover:bg-brand-400"
						>
							Fechar
						</button>
					</div>
				)}
			</div>
		</Modal>
	);
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
	return (
		<div>
			<p className="text-xs text-(--color-fg-muted)">{label}</p>
			<p className={`text-lg font-semibold ${highlight ? "text-amber-500" : ""}`}>{value}</p>
		</div>
	);
}
