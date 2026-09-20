import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNav } from "@/components/ui/bottom-nav";
import { Button } from "@/components/ui/button";
import { CategoryPieChart } from "@/components/ui/category-pie-chart";
import { Chip } from "@/components/ui/chip";
import { DateField } from "@/components/ui/date-field";
import { useSession } from "@/lib/auth-client";
import {
	categoryLabels,
	categoryOptions,
	expenseCategories,
	expenseCategoryColor,
	getCategoryColor,
	getCategoryLabel,
	incomeCategories,
	incomeCategoryColor,
	type TransactionCategory,
} from "@/lib/categories";
import { categoryIcon } from "@/lib/category-icons";
import { formatBRL, isoToBR } from "@/lib/format";
import { useAppColorScheme } from "@/lib/theme";
import {
	type Transaction,
	useDeleteTransaction,
	useTransactionStatistics,
	useTransactionsQuery,
} from "@/query/transactions";
import { Pressable } from "@/shared/components/atoms/pressable";

const ALL_CATEGORIES = "all" as const;
const PER_PAGE = 10;

export default function DashboardScreen() {
	const router = useRouter();
	const { data: session } = useSession();
	const { isDark } = useAppColorScheme();

	const [category, setCategory] = useState<TransactionCategory | typeof ALL_CATEGORIES>(ALL_CATEGORIES);
	const [startDate, setStartDate] = useState<string | null>(null);
	const [endDate, setEndDate] = useState<string | null>(null);
	const [showFilters, setShowFilters] = useState(false);
	const [showCharts, setShowCharts] = useState(false);
	const [page, setPage] = useState(1);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reseta a página sempre que os filtros mudam, mesmo sem lê-los no corpo do efeito.
	useEffect(() => {
		setPage(1);
	}, [category, startDate, endDate]);

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
	const totalIncome = all.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
	const totalExpense = all.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
	const balance = totalIncome - totalExpense;

	const pageCount = Math.max(1, Math.ceil(all.length / PER_PAGE));
	const currentPage = Math.min(page, pageCount);
	const items = all.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

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

	const hasActiveFilters = category !== ALL_CATEGORIES || Boolean(startDate || endDate);
	const firstName = (session?.user.name ?? session?.user.email ?? "").split(" ")[0];
	const iconMuted = isDark ? "#94a3b8" : "#64748b";

	return (
		<SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top", "left", "right"]}>
			<View className="flex-row items-center justify-between px-6 pb-2 pt-2">
				<Text className="text-2xl font-bold text-slate-900 dark:text-white">Olá, {firstName}</Text>
				<Pressable
					accessibilityLabel="Importar extrato Nubank"
					onPress={() => router.push("/import-nubank")}
					hitSlop={8}
					style={{ padding: 8, borderRadius: 10 }}
				>
					<Feather name="upload" size={20} color={iconMuted} />
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
							className="mt-2 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
						>
							<Text className="text-sm text-slate-500 dark:text-slate-400">Saldo Atual</Text>
							<Text
								className={`mt-1 text-3xl font-bold ${balance < 0 ? "text-red-500" : "text-slate-900 dark:text-white"}`}
							>
								{formatBRL(balance)}
							</Text>

							<View className="mt-4 flex-row items-center gap-3">
								<View className="size-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15">
									<Feather name="arrow-up" size={16} color="#059669" />
								</View>
								<View className="flex-1">
									<Text className="text-sm text-slate-500 dark:text-slate-400">Receitas</Text>
									<Text className="text-base font-semibold text-slate-900 dark:text-white">
										{formatBRL(totalIncome)}
									</Text>
								</View>
							</View>
							<View className="mt-3 flex-row items-center gap-3">
								<View className="size-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/15">
									<Feather name="arrow-down" size={16} color="#dc2626" />
								</View>
								<View className="flex-1">
									<Text className="text-sm text-slate-500 dark:text-slate-400">Despesas</Text>
									<Text className="text-base font-semibold text-slate-900 dark:text-white">
										{formatBRL(totalExpense)}
									</Text>
								</View>
							</View>
						</Animated.View>

						<View className="mt-3 flex-row gap-2">
							<Pressable
								onPress={() => setShowFilters((current) => !current)}
								style={{
									flex: 1,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "space-between",
									borderRadius: 12,
									borderWidth: 1,
									borderColor: isDark ? "#1e293b" : "#e2e8f0",
									backgroundColor: isDark ? "#0f172a" : "#ffffff",
									paddingHorizontal: 16,
									paddingVertical: 12,
								}}
							>
								<Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">
									Filtros{hasActiveFilters ? " ●" : ""}
								</Text>
								<Feather
									name={showFilters ? "chevron-up" : "chevron-down"}
									size={16}
									color={iconMuted}
								/>
							</Pressable>
							<Pressable
								onPress={() => setShowCharts((current) => !current)}
								style={{
									flex: 1,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "space-between",
									borderRadius: 12,
									borderWidth: 1,
									borderColor: isDark ? "#1e293b" : "#e2e8f0",
									backgroundColor: isDark ? "#0f172a" : "#ffffff",
									paddingHorizontal: 16,
									paddingVertical: 12,
								}}
							>
								<Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">
									Gráficos
								</Text>
								<Feather
									name={showCharts ? "chevron-up" : "chevron-down"}
									size={16}
									color={iconMuted}
								/>
							</Pressable>
						</View>

						{showFilters ? (
							<View className="mt-3 gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
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
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerClassName="gap-2"
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
							</View>
						) : null}

						{showCharts ? (
							<View className="mt-3 gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
								<View>
									<Text className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
										DESPESAS POR CATEGORIA
									</Text>
									<CategoryPieChart
										slices={expenseSlices}
										emptyLabel="Nenhuma despesa registrada ainda."
									/>
								</View>
								<View>
									<Text className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
										RECEITAS POR CATEGORIA
									</Text>
									<CategoryPieChart
										slices={incomeSlices}
										emptyLabel="Nenhuma receita registrada ainda."
									/>
								</View>
							</View>
						) : null}

						<View className="mt-5 flex-row items-center justify-between pb-1">
							<Text className="text-base font-semibold text-slate-900 dark:text-white">
								Últimas transações
							</Text>
							<Text className="text-xs text-slate-400 dark:text-slate-500">
								{all.length} no total{hasActiveFilters ? " (filtrado)" : ""}
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
							style={{
								marginBottom: 10,
								flexDirection: "row",
								alignItems: "center",
								borderRadius: 16,
								borderWidth: 1,
								borderColor: isDark ? "#1e293b" : "#e2e8f0",
								backgroundColor: isDark ? "#0f172a" : "#ffffff",
								padding: 14,
							}}
						>
							<View
								className="mr-3 size-11 items-center justify-center rounded-xl"
								style={{ backgroundColor: `${getCategoryColor(item.category, item.type)}26` }}
							>
								<Feather
									name={categoryIcon[item.category]}
									size={18}
									color={getCategoryColor(item.category, item.type)}
								/>
							</View>
							<View className="flex-1 pr-2">
								<Text
									className="text-base font-medium text-slate-900 dark:text-white"
									numberOfLines={1}
								>
									{item.description}
								</Text>
								<Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
									{getCategoryLabel(item.category)} · {isoToBR(item.date)}
								</Text>
							</View>
							<Text
								className={`mr-2 text-base font-semibold ${item.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
							>
								{item.type === "income" ? "+" : "−"} {formatBRL(item.amount)}
							</Text>
							<Pressable
								accessibilityLabel="Editar"
								onPress={() => router.push(`/transaction/${item.id}`)}
								hitSlop={6}
								style={{ padding: 6 }}
							>
								<Feather name="edit-2" size={16} color={iconMuted} />
							</Pressable>
							<Pressable
								accessibilityLabel="Excluir"
								onPress={() => confirmDelete(item)}
								hitSlop={6}
								style={{ padding: 6 }}
							>
								<Feather name="trash-2" size={16} color="#dc2626" />
							</Pressable>
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
							<Text className="text-sm font-medium text-slate-600 dark:text-slate-300">
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
							className="items-center rounded-xl border border-dashed border-slate-300 bg-white py-12 dark:border-slate-700 dark:bg-slate-900"
						>
							<Text className="text-sm text-slate-500 dark:text-slate-400">
								Nenhuma transação encontrada.
							</Text>
							<Text className="mt-1 text-xs text-slate-400 dark:text-slate-500">
								Ajuste os filtros ou toque no botão + abaixo.
							</Text>
						</Animated.View>
					)
				}
			/>

			<BottomNav active={null} />
		</SafeAreaView>
	);
}
