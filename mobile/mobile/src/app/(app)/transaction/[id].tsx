import { categoriesForType, type TxType, transactionInput } from "@op/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DateField } from "@/components/ui/date-field";
import { TextField } from "@/components/ui/text-field";
import { centsToBRDigits, MAX_AMOUNT_CENTS, MIN_AMOUNT_CENTS, maskBRLFromDigits, todayISO } from "@/lib/format";
import {
	useCreateTransaction,
	useDeleteTransaction,
	useTransactionQuery,
	useUpdateTransaction,
} from "@/query/transactions";

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
	const [category, setCategory] = useState<string>(categoriesForType("expense")[0]!);
	const [description, setDescription] = useState("");
	const [dateISO, setDateISO] = useState(todayISO());
	const [error, setError] = useState<string | null>(null);

	const categories = useMemo(() => categoriesForType(type), [type]);

	useEffect(() => {
		if (!existing) return;
		setType(existing.type);
		setAmountCents(existing.amountCents);
		setAmountDisplay(centsToBRDigits(existing.amountCents));
		setCategory(existing.category);
		setDescription(existing.description);
		setDateISO(existing.date.slice(0, 10));
	}, [existing]);

	const title = isNew ? "Nova transação" : "Editar transação";
	const submitting = createMut.isPending || updateMut.isPending;

	const onChangeType = (next: TxType) => {
		setType(next);
		setCategory(categoriesForType(next)[0]!);
	};

	const onChangeAmount = (rawValue: string) => {
		const { cents, display } = maskBRLFromDigits(rawValue);
		setAmountCents(cents);
		setAmountDisplay(display);
	};

	const onSubmit = async () => {
		setError(null);
		if (amountCents < MIN_AMOUNT_CENTS) {
			setError("O valor mínimo é R$ 0,01.");
			return;
		}
		if (amountCents > MAX_AMOUNT_CENTS) {
			setError("O valor máximo é R$ 999.999,99.");
			return;
		}

		const parsed = transactionInput.safeParse({
			type,
			amountCents,
			category,
			description: description.trim(),
			date: dateISO,
		});
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
			return;
		}

		try {
			if (isNew) await createMut.mutateAsync(parsed.data);
			else await updateMut.mutateAsync({ id, input: parsed.data });
			router.back();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Não foi possível salvar.");
		}
	};

	const onDelete = () => {
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
	};

	return (
		<SafeAreaView className="flex-1 bg-white">
			<View className="flex-row items-center justify-between border-b border-slate-200 px-5 py-3">
				<Pressable onPress={() => router.back()} hitSlop={8}>
					<Text className="text-base font-medium text-blue-600">Cancelar</Text>
				</Pressable>
				<Text className="text-base font-semibold text-slate-900">{title}</Text>
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
								onPress={() => onChangeType("expense")}
								className={`h-12 flex-1 items-center justify-center rounded-xl border ${
									type === "expense" ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"
								}`}
							>
								<Text
									className={`text-base font-semibold ${
										type === "expense" ? "text-red-600" : "text-slate-500"
									}`}
								>
									Despesa
								</Text>
							</Pressable>
							<Pressable
								onPress={() => onChangeType("income")}
								className={`h-12 flex-1 items-center justify-center rounded-xl border ${
									type === "income" ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-white"
								}`}
							>
								<Text
									className={`text-base font-semibold ${
										type === "income" ? "text-emerald-600" : "text-slate-500"
									}`}
								>
									Receita
								</Text>
							</Pressable>
						</View>

						<TextField
							label="Valor"
							value={amountDisplay}
							onChangeText={onChangeAmount}
							placeholder="R$ 0,00"
							keyboardType="number-pad"
							inputMode="numeric"
						/>
						<Text className="-mt-3 text-xs text-slate-400">Entre R$ 0,01 e R$ 999.999,99</Text>

						<View className="gap-2">
							<Text className="text-sm font-medium text-slate-700">Categoria</Text>
							<View className="flex-row flex-wrap gap-2">
								{categories.map((option) => (
									<Chip
										key={option}
										label={option}
										selected={category === option}
										onPress={() => setCategory(option)}
									/>
								))}
							</View>
						</View>

						<TextField
							label="Descrição"
							value={description}
							onChangeText={setDescription}
							placeholder="Opcional"
						/>

						<DateField label="Data" value={dateISO} onChange={setDateISO} />

						{error ? (
							<Animated.Text entering={FadeInUp.duration(180)} className="text-sm text-red-600">
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
