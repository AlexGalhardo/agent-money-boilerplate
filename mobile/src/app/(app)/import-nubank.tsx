import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { categoryLabels, type TransactionCategory } from "@/lib/categories";
import { formatBRL } from "@/lib/format";

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

/**
 * Mesmo contrato do import web (ver frontend/src/components/import-transactions-modal.tsx):
 * lê o CSV do extrato Nubank como texto, manda pra /transactions/import/preview
 * pra classificar as linhas, e confirma em /transactions/import/confirm.
 * No mobile, o arquivo vem do document picker + expo-file-system em vez de
 * um <input type="file"> do navegador.
 */
export default function ImportNubankScreen() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const [fileName, setFileName] = useState<string | null>(null);
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

		const file = picked.assets[0];
		setFileName(file.name);
		setResult(null);
		setLoadingPreview(true);

		try {
			const csv = await new File(file.uri).text();
			const { data, error: reqError } = await api.transactions.import.preview.post({ csv });
			if (reqError || !data || !("rows" in data)) {
				setError("Não foi possível ler o arquivo CSV");
				return;
			}
			setRows(data.rows as PreviewRow[]);
			setSummary(data.summary);
		} catch {
			setError("Não foi possível ler o arquivo selecionado");
		} finally {
			setLoadingPreview(false);
		}
	}

	async function handleConfirm(): Promise<void> {
		if (!rows) return;
		setConfirming(true);
		const { data, error: reqError } = await api.transactions.import.confirm.post({
			transactions: rows.map((row) => ({
				description: row.description,
				amount: row.amount,
				category: row.category,
				type: row.type,
				createdAt: row.createdAt,
			})),
		});
		setConfirming(false);

		if (reqError || !data || !("created" in data)) {
			setError("Não foi possível importar as transações");
			return;
		}

		setResult(data);
		await queryClient.invalidateQueries({ queryKey: ["transactions"] });
		await queryClient.invalidateQueries({ queryKey: ["transactions-statistics"] });
	}

	const needsReviewRows = rows?.filter((row) => row.needsReview) ?? [];

	return (
		<SafeAreaView className="flex-1 bg-white">
			<View className="flex-row items-center justify-between border-b border-slate-200 px-5 py-3">
				<Pressable onPress={() => router.back()} hitSlop={8}>
					<Text className="text-base font-medium text-blue-600">Fechar</Text>
				</Pressable>
				<Text className="text-base font-semibold text-slate-900">Importar do Nubank</Text>
				<View className="w-14" />
			</View>

			<ScrollView contentContainerClassName="p-6 gap-4">
				{!rows && !result ? (
					<>
						<Text className="text-sm text-slate-500">
							Selecione o arquivo .csv exportado do extrato do Nubank (colunas Data, Valor, Identificador,
							Descrição). Valores negativos viram despesas e positivos viram receitas.
						</Text>
						<Button label="Selecionar arquivo" onPress={handlePickFile} loading={loadingPreview} />
						{fileName && loadingPreview ? (
							<Text className="text-sm text-slate-500">Lendo {fileName}...</Text>
						) : null}
					</>
				) : null}

				{error ? <Text className="text-sm text-red-600">{error}</Text> : null}

				{rows && summary && !result ? (
					<>
						<View className="flex-row flex-wrap gap-3 rounded-xl border border-slate-200 p-3">
							<Stat label="Total" value={summary.total} />
							<Stat label="Receitas" value={summary.income} />
							<Stat label="Despesas" value={summary.expense} />
							<Stat label="Revisar" value={summary.needsReview} highlight={summary.needsReview > 0} />
						</View>

						{needsReviewRows.length > 0 ? (
							<Text className="text-sm text-amber-600">
								Não consegui identificar a categoria de {needsReviewRows.length}{" "}
								{needsReviewRows.length === 1 ? "transação" : "transações"} automaticamente — elas
								entram como "Outros" e podem ser editadas depois de importar.
							</Text>
						) : null}

						<View className="gap-2">
							{rows.slice(0, 50).map((row) => (
								<View
									key={row.rowNumber}
									className="flex-row items-center justify-between rounded-lg border border-slate-200 p-3"
								>
									<View className="flex-1 pr-3">
										<Text className="text-sm text-slate-900" numberOfLines={1}>
											{row.description}
										</Text>
										<Text className="mt-0.5 text-xs text-slate-500">
											{categoryLabels[row.category]}
										</Text>
									</View>
									<Text
										className={`text-sm font-semibold ${row.type === "income" ? "text-emerald-600" : "text-red-600"}`}
									>
										{row.type === "income" ? "+" : "-"}
										{formatBRL(row.amount)}
									</Text>
								</View>
							))}
							{rows.length > 50 ? (
								<Text className="text-xs text-slate-400">+ {rows.length - 50} outras transações</Text>
							) : null}
						</View>

						<Button
							label={`Confirmar importação (${rows.length})`}
							onPress={handleConfirm}
							loading={confirming}
						/>
						<Button
							label="Escolher outro arquivo"
							variant="secondary"
							onPress={() => {
								setRows(null);
								setSummary(null);
								setFileName(null);
							}}
						/>
					</>
				) : null}

				{result ? (
					<View className="gap-3">
						<Text className="text-sm text-slate-700">
							{result.created} {result.created === 1 ? "transação importada" : "transações importadas"}{" "}
							com sucesso.
							{result.skippedDuplicates > 0
								? ` ${result.skippedDuplicates} ${result.skippedDuplicates === 1 ? "já existia" : "já existiam"} e ${result.skippedDuplicates === 1 ? "foi ignorada" : "foram ignoradas"}.`
								: ""}
						</Text>
						<Button label="Concluir" onPress={() => router.back()} />
					</View>
				) : null}

				{loadingPreview ? (
					<View className="items-center py-8">
						<ActivityIndicator />
					</View>
				) : null}
			</ScrollView>
		</SafeAreaView>
	);
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
	return (
		<View className="min-w-20">
			<Text className="text-xs text-slate-500">{label}</Text>
			<Text className={`text-lg font-semibold ${highlight ? "text-amber-600" : "text-slate-900"}`}>{value}</Text>
		</View>
	);
}
