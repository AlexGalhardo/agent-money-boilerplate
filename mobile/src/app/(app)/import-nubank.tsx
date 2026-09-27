import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Screen } from "@/components/ui/screen";
import { api } from "@/lib/api";
import { categoryLabels, type TransactionCategory } from "@/lib/categories";
import { formatBRL } from "@/lib/format";
import { colors } from "@/theme";

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

const PREVIEW_LIMIT = 50;

/**
 * Same contract as the web import (frontend/src/components/import-transactions-modal.tsx):
 * read the Nubank CSV as text, POST it to /transactions/import/preview to
 * classify the rows, then confirm on /transactions/import/confirm. On mobile
 * the file comes from the document picker + expo-file-system.
 */
export default function ImportNubankScreen() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const [loadingPreview, setLoadingPreview] = useState(false);
	const [rows, setRows] = useState<PreviewRow[] | null>(null);
	const [summary, setSummary] = useState<PreviewSummary | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [confirming, setConfirming] = useState(false);
	const [result, setResult] = useState<{ created: number; skippedDuplicates: number } | null>(null);

	async function handlePickFile(): Promise<void> {
		setError(null);
		const picked = await DocumentPicker.getDocumentAsync({
			type: ["text/csv", "text/comma-separated-values", "*/*"],
		});
		if (picked.canceled || !picked.assets?.[0]) return;

		setResult(null);
		setLoadingPreview(true);
		try {
			const csv = await new File(picked.assets[0].uri).text();
			const { data, error: reqError } = await api.transactions.import.preview.post({ csv });
			if (reqError || !data || !("rows" in data)) {
				setError("Não foi possível ler o arquivo CSV. Confira se é um extrato do Nubank.");
				return;
			}
			setRows(data.rows as PreviewRow[]);
			setSummary(data.summary);
		} catch {
			setError("Não foi possível ler o arquivo selecionado.");
		} finally {
			setLoadingPreview(false);
		}
	}

	async function handleConfirm(): Promise<void> {
		if (!rows) return;
		setConfirming(true);
		const { data, error: reqError } = await api.transactions.import.confirm.post({
			transactions: rows.map(({ description, amount, category, type, createdAt }) => ({
				description,
				amount,
				category,
				type,
				createdAt,
			})),
		});
		setConfirming(false);

		if (reqError || !data || !("created" in data)) {
			setError("Não foi possível importar as transações.");
			return;
		}

		setResult(data);
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ["transactions"] }),
			queryClient.invalidateQueries({ queryKey: ["transactions-statistics"] }),
			queryClient.invalidateQueries({ queryKey: ["me"] }),
		]);
	}

	function reset(): void {
		setRows(null);
		setSummary(null);
		setError(null);
	}

	if (result) {
		return (
			<Screen scroll edges={["left", "right", "bottom"]} contentClassName="items-center justify-center gap-4">
				<View className="size-14 items-center justify-center rounded-full bg-income/15">
					<Feather name="check" size={26} color={colors.income} />
				</View>
				<Text className="text-title text-fg">
					{result.created} {result.created === 1 ? "transação importada" : "transações importadas"}
				</Text>
				{result.skippedDuplicates > 0 ? (
					<Text className="text-center text-body text-muted">
						{result.skippedDuplicates} {result.skippedDuplicates === 1 ? "já existia" : "já existiam"} e{" "}
						{result.skippedDuplicates === 1 ? "foi ignorada" : "foram ignoradas"}.
					</Text>
				) : null}
				<Button label="Concluir" onPress={() => router.back()} className="self-stretch" />
			</Screen>
		);
	}

	return (
		<Screen scroll edges={["left", "right", "bottom"]} contentClassName="gap-6">
			{!rows ? (
				<>
					<View className="items-center gap-3 rounded-card bg-surface px-5 py-8">
						<View className="size-12 items-center justify-center rounded-full bg-raised">
							<Feather name="file-text" size={20} color={colors.muted} />
						</View>
						<Text className="text-headline text-fg">Extrato do Nubank (.csv)</Text>
						<Text className="text-center text-subhead text-muted">
							Colunas Data, Valor, Identificador e Descrição. Valores negativos viram despesas; positivos,
							receitas.
						</Text>
					</View>
					<Notice kind="error" message={error} />
					{loadingPreview ? (
						<LoadingState />
					) : (
						<Button
							label="Selecionar arquivo"
							icon={<Feather name="upload" size={16} color={colors["on-primary"]} />}
							onPress={handlePickFile}
						/>
					)}
				</>
			) : null}

			{rows && summary ? (
				<>
					<View className="flex-row gap-3">
						<Stat label="Total" value={summary.total} />
						<Stat label="Receitas" value={summary.income} />
						<Stat label="Despesas" value={summary.expense} />
						<Stat label="Revisar" value={summary.needsReview} highlight={summary.needsReview > 0} />
					</View>

					{summary.needsReview > 0 ? (
						<Notice
							kind="warning"
							message={`${summary.needsReview} ${summary.needsReview === 1 ? "transação entra" : "transações entram"} como "Outros" — dá para ajustar a categoria depois de importar.`}
						/>
					) : null}

					<View className="overflow-hidden rounded-card bg-surface">
						{rows.slice(0, PREVIEW_LIMIT).map((row, index, list) => (
							<View
								key={row.rowNumber}
								className={`flex-row items-center gap-3 px-4 py-3 ${index === list.length - 1 ? "" : "border-b border-line"}`}
							>
								<View className="flex-1">
									<Text className="text-subhead text-fg" numberOfLines={1}>
										{row.description}
									</Text>
									<Text className="mt-0.5 text-caption text-subtle">
										{categoryLabels[row.category]}
									</Text>
								</View>
								<Text
									className={`text-subhead font-semibold ${row.type === "income" ? "text-income" : "text-fg"}`}
								>
									{row.type === "income" ? "+" : "−"} {formatBRL(row.amount)}
								</Text>
							</View>
						))}
					</View>
					{rows.length > PREVIEW_LIMIT ? (
						<Text className="text-center text-caption text-subtle">
							+ {rows.length - PREVIEW_LIMIT} outras transações
						</Text>
					) : null}

					<Notice kind="error" message={error} />

					<View className="gap-3">
						<Button
							label={`Importar ${rows.length} transações`}
							onPress={handleConfirm}
							loading={confirming}
						/>
						<Button label="Escolher outro arquivo" variant="ghost" onPress={reset} />
					</View>
				</>
			) : null}
		</Screen>
	);
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
	return (
		<View className="flex-1 rounded-control bg-surface px-3 py-3">
			<Text className="text-caption text-subtle">{label}</Text>
			<Text className={`mt-1 text-headline ${highlight ? "text-warning" : "text-fg"}`}>{value}</Text>
		</View>
	);
}
