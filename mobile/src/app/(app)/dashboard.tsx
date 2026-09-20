import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { CategoryPieChart } from "@/components/ui/category-pie-chart";
import { Chip } from "@/components/ui/chip";
import { DateField } from "@/components/ui/date-field";
import { TextField } from "@/components/ui/text-field";
import { signOut, useSession } from "@/lib/auth-client";
import {
	categoryLabels,
	categoryOptions,
	expenseCategories,
	expenseCategoryColor,
	getCategoryLabel,
	incomeCategories,
	incomeCategoryColor,
	type TransactionCategory,
} from "@/lib/categories";
import { formatBRL, isoToBR } from "@/lib/format";
import {
	type Transaction,
	useDeleteTransaction,
	useTransactionStatistics,
	useTransactionsQuery,
} from "@/query/transactions";
import { Pressable } from "@/shared/components/atoms/pressable";

const ALL_CATEGORIES = "all" as const;
const PER_PAGE = 10;

const navButtonStyle = { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8 };

function normalizeSearchText(value: string): string {
	return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function DashboardScreen() {
	const router = useRouter();
	const { data: session } = useSession();

	const [category, setCategory] = useState<TransactionCategory | typeof ALL_CATEGORIES>(ALL_CATEGORIES);
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [startDate, setStartDate] = useState<string | null>(null);
	const [endDate, setEndDate] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [showCharts, setShowCharts] = useState(false);

	useEffect(() => {
		const handle = setTimeout(() => setSearch(searchInput.trim()), 300);
		return () => clearTimeout(handle);
	}, [searchInput]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reseta a página sempre que os filtros mudam, mesmo sem lê-los no corpo do efeito.
	useEffect(() => {
		setPage(1);
	}, [category, search, startDate, endDate]);

	const serverFilters = useMemo(
		() => ({
			...(category !== ALL_CATEGORIES ? { category } : {}),
			...(startDate ? { from: new Date(startDate).toISOString() } : {}),
			...(endDate ? { to: new Date(endDate).toISOString() } : {}),
		}),
		[category, startDate, endDate],
	);

	const transactionsQuery = useTransactionsQuery(serverFilters);
	const statsQuery = useTransactionStatistics();
	const deleteMutation = useDeleteTransaction();

	const all = transactionsQuery.data ?? [];
	const trimmedSearch = search.trim();
	const filtered =
		trimmedSearch.length >= 3
			? all.filter((tx) => normalizeSearchText(tx.description).includes(normalizeSearchText(trimmedSearch)))
			: all;

	const totalIncome = filtered.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
	const totalExpense = filtered.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
	const balance = totalIncome - totalExpense;

	const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
	const currentPage = Math.min(page, pageCount);
	const items = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

	const expenseSlices = (statsQuery.data ?? [])
		.filter((row) => row.type === "expense" && expenseCategories.includes(row.category as TransactionCategory))
		.map((row) => ({
			category: row.category,
			label: getCategoryLabel(row.category),
			total: row.total,
			color: expenseCategoryColor[row.category] ?? "#94a3b8",
		}));
	const incomeSlices = (statsQuery.data ?? [])
		.filter((row) => row.type === "income" && incomeCategories.includes(row.category as TransactionCategory))
		.map((row) => ({
			category: row.category,
			label: getCategoryLabel(row.category),
			total: row.total,
			color: incomeCategoryColor[row.category] ?? "#94a3b8",
		}));

	function confirmDelete(tx: Transaction): void {
		Alert.alert("Excluir transação", `Deseja remover "${tx.description}"?`, [
			{ text: "Cancelar", style: "cancel" },
			{ text: "Excluir", style: "destructive", onPress: () => deleteMutation.mutate(tx.id) },
		]);
	}

	const hasDateRange = Boolean(startDate || endDate);

	return (
		<SafeAreaView className="flex-1 bg-slate-50" edges={["top", "left", "right"]}>
			<View className="flex-row items-center justify-between px-6 pb-2 pt-2">
				<View className="flex-1 pr-3">
					<Text className="text-xs text-slate-500">Conectado como</Text>
					<Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>
						{session?.user.name ?? session?.user.email}
					</Text>
				</View>
				<Pressable onPress={() => router.push("/import-nubank")} style={navButtonStyle}>
					<Text className="text-sm font-semibold text-blue-600">Importar</Text>
				</Pressable>
				<Pressable onPress={() => router.push("/subscription")} style={navButtonStyle}>
					<Text className="text-sm font-semibold text-blue-600">Plano</Text>
				</Pressable>
				<Pressable onPress={() => router.push("/profile")} style={navButtonStyle}>
					<Text className="text-sm font-semibold text-blue-600">Perfil</Text>
				</Pressable>
				<Pressable onPress={() => signOut()} style={navButtonStyle}>
					<Text className="text-sm font-semibold text-blue-600">Sair</Text>
				</Pressable>
			</View>

			<FlatList
				data={items}
				keyExtractor={(item) => item.id}
				contentContainerClassName="px-6 pb-40"
				ListHeaderComponent={
					<View className="pb-2">
						<Animated.View
							entering={FadeInDown.duration(240)}
							layout={LinearTransition.duration(200)}
							className="mt-2 rounded-2xl bg-slate-900 p-5"
						>
							<Text className="text-sm text-slate-300">Saldo</Text>
							<Text
								className={`mt-1 text-3xl font-bold ${balance < 0 ? "text-red-400" : "text-emerald-400"}`}
							>
								{formatBRL(balance)}
							</Text>
							<View className="mt-4 flex-row gap-3">
								<View className="flex-1 rounded-xl bg-white/10 p-3">
									<Text className="text-xs text-slate-300">Receitas</Text>
									<Text className="mt-1 text-base font-semibold text-emerald-300">
										{formatBRL(totalIncome)}
									</Text>
								</View>
								<View className="flex-1 rounded-xl bg-white/10 p-3">
									<Text className="text-xs text-slate-300">Despesas</Text>
									<Text className="mt-1 text-base font-semibold text-red-300">
										{formatBRL(totalExpense)}
									</Text>
								</View>
							</View>
						</Animated.View>

						<Pressable
							onPress={() => setShowCharts((current) => !current)}
							style={{
								marginTop: 16,
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "space-between",
								borderRadius: 12,
								borderWidth: 1,
								borderColor: "#e2e8f0",
								backgroundColor: "#ffffff",
								paddingHorizontal: 16,
								paddingVertical: 12,
							}}
						>
							<Text className="text-sm font-semibold text-slate-700">Gráficos por categoria</Text>
							<Text className="text-sm text-slate-400">{showCharts ? "Ocultar ▲" : "Mostrar ▼"}</Text>
						</Pressable>

						{showCharts ? (
							<View className="mt-3 gap-4 rounded-xl border border-slate-200 bg-white p-4">
								<View>
									<Text className="mb-2 text-xs font-semibold text-slate-500">
										DESPESAS POR CATEGORIA
									</Text>
									<CategoryPieChart
										slices={expenseSlices}
										emptyLabel="Nenhuma despesa registrada ainda."
									/>
								</View>
								<View>
									<Text className="mb-2 text-xs font-semibold text-slate-500">
										RECEITAS POR CATEGORIA
									</Text>
									<CategoryPieChart
										slices={incomeSlices}
										emptyLabel="Nenhuma receita registrada ainda."
									/>
								</View>
							</View>
						) : null}

						<View className="mt-4 gap-3">
							<TextField
								label="Buscar"
								value={searchInput}
								onChangeText={setSearchInput}
								placeholder="Digite pelo menos 3 caracteres..."
								autoCapitalize="none"
								autoCorrect={false}
							/>
							<View className="flex-row gap-3">
								<View className="flex-1">
									<DateField
										label="De"
										value={startDate}
										onChange={setStartDate}
										onClear={() => setStartDate(null)}
										placeholder="Início"
										maximumDate={endDate ? new Date(endDate) : undefined}
									/>
								</View>
								<View className="flex-1">
									<DateField
										label="Até"
										value={endDate}
										onChange={setEndDate}
										onClear={() => setEndDate(null)}
										placeholder="Fim"
										minimumDate={startDate ? new Date(startDate) : undefined}
									/>
								</View>
							</View>
						</View>

						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerClassName="gap-2 py-4"
						>
							<Chip
								label="Todas"
								selected={category === ALL_CATEGORIES}
								onPress={() => setCategory(ALL_CATEGORIES)}
							/>
							{categoryOptions.map((option) => (
								<Chip
									key={option}
									label={categoryLabels[option]}
									selected={category === option}
									onPress={() => setCategory(option)}
								/>
							))}
						</ScrollView>

						<View className="flex-row items-center justify-between pb-1">
							<Text className="text-sm font-semibold text-slate-500">
								Transações {transactionsQuery.isFetching ? "·" : ""}
							</Text>
							<Text className="text-xs text-slate-400">
								{filtered.length} no total
								{category !== ALL_CATEGORIES || search || hasDateRange ? " (filtrado)" : ""}
							</Text>
						</View>
					</View>
				}
				renderItem={({ item }) => (
					<Animated.View
						entering={FadeIn.duration(160)}
						exiting={FadeOut.duration(160)}
						layout={LinearTransition.duration(200)}
					>
						<Pressable
							onPress={() => router.push(`/transaction/${item.id}`)}
							onLongPress={() => confirmDelete(item)}
							style={{
								marginBottom: 8,
								flexDirection: "row",
								alignItems: "center",
								borderRadius: 12,
								borderWidth: 1,
								borderColor: "#e2e8f0",
								backgroundColor: "#ffffff",
								padding: 16,
							}}
						>
							<View className="flex-1 pr-3">
								<Text className="text-base font-medium text-slate-900" numberOfLines={1}>
									{item.description}
								</Text>
								<Text className="mt-0.5 text-xs text-slate-500">
									{getCategoryLabel(item.category)} · {isoToBR(item.date)}
								</Text>
							</View>
							<View className="items-end">
								<Text
									className={`text-base font-semibold ${item.type === "income" ? "text-emerald-600" : "text-red-600"}`}
								>
									{item.type === "income" ? "+ " : "− "}
									{formatBRL(item.amount)}
								</Text>
								<Pressable hitSlop={8} onPress={() => confirmDelete(item)}>
									<Text className="mt-1 text-xs font-medium text-slate-400">Excluir</Text>
								</Pressable>
							</View>
						</Pressable>
					</Animated.View>
				)}
				ListFooterComponent={
					pageCount > 1 ? (
						<View className="mt-2 flex-row items-center justify-between">
							<Button
								label="Anterior"
								variant="secondary"
								onPress={() => setPage((p) => Math.max(1, p - 1))}
								disabled={currentPage <= 1}
							/>
							<Text className="text-sm font-medium text-slate-600">
								Página {currentPage} de {pageCount}
							</Text>
							<Button
								label="Próxima"
								variant="secondary"
								onPress={() => setPage((p) => Math.min(pageCount, p + 1))}
								disabled={currentPage >= pageCount}
							/>
						</View>
					) : null
				}
				ListEmptyComponent={
					transactionsQuery.isPending ? (
						<View className="items-center py-16">
							<ActivityIndicator />
						</View>
					) : (
						<Animated.View
							entering={FadeInDown.duration(200)}
							className="items-center rounded-xl border border-dashed border-slate-300 bg-white py-12"
						>
							<Text className="text-sm text-slate-500">Nenhuma transação encontrada.</Text>
							<Text className="mt-1 text-xs text-slate-400">
								Ajuste os filtros ou toque em "Nova transação".
							</Text>
						</Animated.View>
					)
				}
			/>

			<View className="absolute inset-x-0 bottom-0 border-t border-slate-200 bg-slate-50 px-6 pb-6 pt-3">
				<Button label="Nova transação" onPress={() => router.push("/transaction/new")} />
			</View>
		</SafeAreaView>
	);
}
