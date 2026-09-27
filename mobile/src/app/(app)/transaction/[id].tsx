import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DateField } from "@/components/ui/date-field";
import { LoadingState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import { categoryLabels, expenseCategories, incomeCategories, type TransactionCategory } from "@/lib/categories";
import { centsToBRDigits, MAX_AMOUNT_CENTS, MIN_AMOUNT_CENTS, maskBRLFromDigits, todayISO } from "@/lib/format";
import {
	useCreateTransaction,
	useDeleteTransaction,
	useTransactionQuery,
	useUpdateTransaction,
} from "@/query/transactions";
import { colors } from "@/theme";

type TxType = "income" | "expense";

const TYPE_OPTIONS = [
	{ value: "expense", label: "Despesa", activeClassName: "text-expense" },
	{ value: "income", label: "Receita", activeClassName: "text-income" },
] as const;

function categoriesForType(type: TxType): TransactionCategory[] {
	return type === "income" ? incomeCategories : expenseCategories;
}

function firstCategory(type: TxType): TransactionCategory {
	return categoriesForType(type)[0] as TransactionCategory;
}

export default function TransactionFormScreen() {
	const router = useRouter();
	const { id } = useLocalSearchParams<{ id: string }>();
	const isNew = id === "new";

	const { data: existing, isPending: loading } = useTransactionQuery(id, !isNew);
	const createMut = useCreateTransaction();
	const updateMut = useUpdateTransaction();
	const deleteMut = useDeleteTransaction();

	const [type, setType] = useState<TxType>("expense");
	const [amountCents, setAmountCents] = useState(0);
	const [amountDisplay, setAmountDisplay] = useState("");
	const [category, setCategory] = useState<TransactionCategory>(firstCategory("expense"));
	const [description, setDescription] = useState("");
	const [dateISO, setDateISO] = useState(todayISO());
	const [error, setError] = useState<string | null>(null);

	const categories = useMemo(() => categoriesForType(type), [type]);

	useEffect(() => {
		if (!existing) return;
		setType(existing.type);
		setAmountCents(existing.amount);
		setAmountDisplay(centsToBRDigits(existing.amount));
		setCategory(existing.category);
		setDescription(existing.description);
		setDateISO(existing.date.slice(0, 10));
	}, [existing]);

	function onChangeType(next: TxType): void {
		setType(next);
		setCategory(firstCategory(next));
	}

	function onChangeAmount(rawValue: string): void {
		const { cents, display } = maskBRLFromDigits(rawValue);
		setAmountCents(cents);
		setAmountDisplay(display);
	}

	async function onSubmit(): Promise<void> {
		setError(null);
		if (amountCents < MIN_AMOUNT_CENTS) return setError("O valor mínimo é R$ 0,01.");
		if (amountCents > MAX_AMOUNT_CENTS) return setError("O valor máximo é R$ 999.999,99.");
		if (!description.trim()) return setError("Informe uma descrição.");

		const input = {
			type,
			amount: amountCents,
			category,
			description: description.trim(),
			date: new Date(`${dateISO}T12:00:00`).toISOString(),
		};

		try {
			if (isNew) await createMut.mutateAsync(input);
			else await updateMut.mutateAsync({ id, input });
			router.back();
		} catch {
			setError("Não foi possível salvar a transação.");
		}
	}

	// A native confirmation is right here: deleting is irreversible and rare.
	function onDelete(): void {
		Alert.alert("Excluir transação", "Esta ação não pode ser desfeita.", [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Excluir",
				style: "destructive",
				onPress: async () => {
					await deleteMut.mutateAsync(id);
					router.back();
				},
			},
		]);
	}

	const header = (
		<Stack.Screen
			options={{
				title: isNew ? "Nova transação" : "Editar transação",
				headerLeft: () => (
					<Pressable onPress={() => router.back()} hitSlop={10} className="active:opacity-60">
						<Text className="text-body text-muted">Cancelar</Text>
					</Pressable>
				),
			}}
		/>
	);

	if (!isNew && loading) {
		return (
			<Screen edges={["left", "right"]}>
				{header}
				<LoadingState />
			</Screen>
		);
	}

	return (
		<Screen scroll edges={["left", "right", "bottom"]} contentClassName="gap-6">
			{header}

			<SegmentedControl options={TYPE_OPTIONS} value={type} onChange={onChangeType} />

			<View className="items-center gap-1 py-2">
				<Text className="text-footnote text-subtle">Valor</Text>
				<View className="flex-row items-center justify-center gap-2">
					<Text className="text-title text-subtle">R$</Text>
					<TextInput
						value={amountDisplay}
						onChangeText={onChangeAmount}
						placeholder="0,00"
						placeholderTextColor={colors.subtle}
						selectionColor={colors.brand}
						keyboardType="number-pad"
						inputMode="numeric"
						testID="field-Valor"
						accessibilityLabel="Valor"
						className={`min-w-[120px] text-center text-[44px] font-bold web:outline-none ${type === "income" ? "text-income" : "text-fg"}`}
					/>
				</View>
				<Text className="text-caption text-subtle">Entre R$ 0,01 e R$ 999.999,99</Text>
			</View>

			<TextField
				label="Descrição"
				value={description}
				onChangeText={setDescription}
				placeholder="Ex: Supermercado"
				maxLength={280}
			/>

			<View className="gap-2">
				<Text className="text-footnote font-medium text-muted">Categoria</Text>
				<View className="flex-row flex-wrap gap-2">
					{categories.map((option) => (
						<Chip
							key={option}
							label={categoryLabels[option]}
							selected={category === option}
							onPress={() => setCategory(option)}
						/>
					))}
				</View>
			</View>

			<DateField label="Data" value={dateISO} onChange={setDateISO} />

			<Notice kind="error" message={error} />

			<View className="gap-3">
				<Button
					label={isNew ? "Adicionar" : "Salvar alterações"}
					onPress={onSubmit}
					loading={createMut.isPending || updateMut.isPending}
				/>
				{!isNew ? (
					<Button
						label="Excluir transação"
						variant="danger"
						onPress={onDelete}
						loading={deleteMut.isPending}
					/>
				) : null}
			</View>
		</Screen>
	);
}
