import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DateField } from "@/components/ui/date-field";
import { TextField } from "@/components/ui/text-field";
import { categoryLabels, expenseCategories, incomeCategories, type TransactionCategory } from "@/lib/categories";
import { centsToBRDigits, MAX_AMOUNT_CENTS, MIN_AMOUNT_CENTS, maskBRLFromDigits, todayISO } from "@/lib/format";
import { useAppColorScheme } from "@/lib/theme";
import {
	useCreateTransaction,
	useDeleteTransaction,
	useTransactionQuery,
	useUpdateTransaction,
} from "@/query/transactions";
import { Pressable } from "@/shared/components/atoms/pressable";

type TxType = "income" | "expense";

function categoriesForType(type: TxType): TransactionCategory[] {
	return type === "income" ? incomeCategories : expenseCategories;
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
	const [category, setCategory] = useState<TransactionCategory>(
		categoriesForType("expense")[0] as TransactionCategory,
	);
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

	const title = isNew ? "Nova transação" : "Editar transação";
	const submitting = createMut.isPending || updateMut.isPending;

	function onChangeType(next: TxType): void {
		setType(next);
		setCategory(categoriesForType(next)[0] as TransactionCategory);
	}

	function onChangeAmount(rawValue: string): void {
		const { cents, display } = maskBRLFromDigits(rawValue);
		setAmountCents(cents);
		setAmountDisplay(display);
	}

	async function onSubmit(): Promise<void> {
		setError(null);
		if (amountCents < MIN_AMOUNT_CENTS) {
			setError("O valor mínimo é R$ 0,01.");
			return;
		}
		if (amountCents > MAX_AMOUNT_CENTS) {
			setError("O valor máximo é R$ 999.999,99.");
			return;
		}
		if (!description.trim()) {
			setError("Informe uma descrição.");
			return;
		}

		const input = {
			type,
			amount: amountCents,
			category,
			description: description.trim(),
			date: new Date(dateISO).toISOString(),
		};

		try {
			if (isNew) await createMut.mutateAsync(input);
			else await updateMut.mutateAsync({ id, input });
			router.back();
		} catch {
			setError("Não foi possível salvar a transação.");
		}
	}

	function onDelete(): void {
		if (isNew) return;
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

	const { isDark } = useAppColorScheme();

	return (
		<SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
			<View className="flex-row items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
				<Pressable onPress={() => router.back()} hitSlop={8}>
					<Text className="text-base font-medium text-blue-600 dark:text-blue-400">Cancelar</Text>
				</Pressable>
				<Text className="text-base font-semibold text-slate-900 dark:text-white">{title}</Text>
				<View className="w-16" />
			</View>

			{!isNew && loading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator />
				</View>
			) : (
				<KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
					<Animated.ScrollView
						entering={FadeInDown.duration(240)}
						contentContainerClassName="p-6 gap-5"
						keyboardShouldPersistTaps="handled"
					>
						<View className="flex-row gap-3">
							<Pressable
								onPress={() => onChangeType("income")}
								style={{
									flex: 1,
									height: 52,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									gap: 8,
									borderRadius: 12,
									borderWidth: 1,
									borderColor: type === "income" ? "#10b981" : isDark ? "#334155" : "#cbd5e1",
									backgroundColor:
										type === "income" ? (isDark ? "#064e3b40" : "#ecfdf5") : "transparent",
								}}
							>
								<Feather
									name="arrow-up-circle"
									size={18}
									color={type === "income" ? "#10b981" : "#64748b"}
								/>
								<Text
									className={`text-base font-semibold ${type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}
								>
									RECEITA
								</Text>
							</Pressable>
							<Pressable
								onPress={() => onChangeType("expense")}
								style={{
									flex: 1,
									height: 52,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									gap: 8,
									borderRadius: 12,
									borderWidth: 1,
									borderColor: type === "expense" ? "#ef4444" : isDark ? "#334155" : "#cbd5e1",
									backgroundColor:
										type === "expense" ? (isDark ? "#7f1d1d40" : "#fef2f2") : "transparent",
								}}
							>
								<Feather
									name="arrow-down-circle"
									size={18}
									color={type === "expense" ? "#ef4444" : "#64748b"}
								/>
								<Text
									className={`text-base font-semibold ${type === "expense" ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}
								>
									DESPESA
								</Text>
							</Pressable>
						</View>

						<View className="gap-2">
							<Text className="text-sm font-medium text-slate-700 dark:text-slate-200">Categoria</Text>
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

						<DateField label="Data da transação" value={dateISO} onChange={setDateISO} />

						<TextField
							label="Descrição"
							value={description}
							onChangeText={setDescription}
							placeholder="Ex: Supermercado"
						/>

						<View className="gap-1">
							<TextField
								label="Valor"
								value={amountDisplay}
								onChangeText={onChangeAmount}
								placeholder="R$ 0,00"
								keyboardType="number-pad"
								inputMode="numeric"
							/>
							<Text className="text-xs text-slate-400 dark:text-slate-500">
								Entre R$ 0,01 e R$ 999.999,99
							</Text>
						</View>

						{error ? (
							<Animated.Text
								entering={FadeInUp.duration(180)}
								className="text-sm text-red-600 dark:text-red-400"
							>
								{error}
							</Animated.Text>
						) : null}

						<Button
							label={isNew ? "Adicionar" : "Salvar alterações"}
							onPress={onSubmit}
							loading={submitting}
						/>

						{!isNew ? <Button label="Excluir transação" variant="danger" onPress={onDelete} /> : null}
					</Animated.ScrollView>
				</KeyboardAvoidingView>
			)}
		</SafeAreaView>
	);
}
