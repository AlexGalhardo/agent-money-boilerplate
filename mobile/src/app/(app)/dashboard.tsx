import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { BottomNav } from "@/components/ui/bottom-nav";
import { Button } from "@/components/ui/button";
import { CategoryPieChart } from "@/components/ui/category-pie-chart";
import { Chip } from "@/components/ui/chip";
import { DateField } from "@/components/ui/date-field";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { Section } from "@/components/ui/section";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TransactionRow } from "@/components/ui/transaction-row";
import { useSession } from "@/lib/auth-client";
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
import { formatBRL } from "@/lib/format";
import { totals } from "@/lib/transaction-math";
import { useTransactionStatistics, useTransactionsQuery } from "@/query/transactions";
import { colors } from "@/theme";

const ALL = "all" as const;
const PAGE_SIZE = 20;

type ChartType = "expense" | "income";

export default function DashboardScreen() {
	const router = useRouter();
	const { data: session } = useSession();

	const [category, setCategory] = useState<TransactionCategory | typeof ALL>(ALL);
	const [startDate, setStartDate] = useState<string | null>(null);
	const [endDate, setEndDate] = useState<string | null>(null);
	const [showDates, setShowDates] = useState(false);
	const [chartType, setChartType] = useState<ChartType>("expense");
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

	const filters = useMemo(
		() => ({
			...(category !== ALL ? { category } : {}),
			...(startDate ? { from: new Date(startDate).toISOString() } : {}),
			...(endDate ? { to: new Date(`${endDate}T23:59:59`).toISOString() } : {}),
		}),
		[category, startDate, endDate],
	);

	const transactionsQuery = useTransactionsQuery(filters);
	const statsQuery = useTransactionStatistics();

	const all = transactionsQuery.data ?? [];
	const summary = totals(all);
	const visible = all.slice(0, visibleCount);
	const hasDateFilter = Boolean(startDate || endDate);

	const slices = (statsQuery.data ?? [])
		.filter(
			(row) =>
				row.type === chartType &&
				(chartType === "expense" ? expenseCategories : incomeCategories).includes(
					row.category as TransactionCategory,
				),
		)
		.map((row) => ({
			category: row.category,
			label: getCategoryLabel(row.category),
			total: row.total,
			color:
				(chartType === "expense" ? expenseCategoryColor : incomeCategoryColor)[row.category] ?? colors.subtle,
		}));

	function applyCategory(next: TransactionCategory | typeof ALL): void {
		setCategory(next);
		setVisibleCount(PAGE_SIZE);
	}

	const firstName = (session?.user.name ?? session?.user.email ?? "").split(" ")[0];

	return (
		<Screen>
			<ScrollView
				contentContainerClassName="gap-7 px-5 pb-10 pt-4"
				refreshControl={
					<RefreshControl
						refreshing={transactionsQuery.isRefetching}
						onRefresh={() => {
							transactionsQuery.refetch();
							statsQuery.refetch();
						}}
						tintColor={colors.muted}
					/>
				}
			>
				<View className="flex-row items-center justify-between">
					<View>
						<Text className="text-footnote text-subtle">Bem-vindo de volta</Text>
						<Text className="text-title text-fg">Olá, {firstName}</Text>
					</View>
					<Pressable
						onPress={() => router.push("/profile")}
						accessibilityRole="button"
						accessibilityLabel="Abrir minha conta"
						className="size-10 items-center justify-center rounded-full bg-raised active:opacity-70"
					>
						<Text className="text-headline text-fg">{firstName.charAt(0).toUpperCase()}</Text>
					</Pressable>
				</View>

				<View className="gap-5">
					<View>
						<Text className="text-footnote font-medium text-muted">
							{category === ALL && !hasDateFilter ? "Saldo atual" : "Saldo no filtro"}
						</Text>
						<Text className={`mt-1 text-display ${summary.balance < 0 ? "text-expense" : "text-fg"}`}>
							{formatBRL(summary.balance)}
						</Text>
					</View>
					<View className="flex-row gap-3">
						<Stat label="Receitas" value={summary.income} icon="arrow-down-left" color={colors.income} />
						<Stat label="Despesas" value={summary.expense} icon="arrow-up-right" color={colors.expense} />
					</View>
				</View>

				<View className="gap-3">
					<View className="flex-row items-center justify-between">
						<Text className="text-headline text-fg">Filtros</Text>
						<Pressable
							onPress={() => setShowDates((current) => !current)}
							accessibilityRole="button"
							accessibilityLabel="Filtrar por período"
							accessibilityState={{ expanded: showDates }}
							className="flex-row items-center gap-1.5 active:opacity-60"
						>
							<Feather name="calendar" size={14} color={hasDateFilter ? colors.brand : colors.muted} />
							<Text
								className={`text-footnote font-medium ${hasDateFilter ? "text-brand" : "text-muted"}`}
							>
								Período
							</Text>
						</Pressable>
					</View>
					{showDates ? (
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
					) : null}
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerClassName="gap-2"
						className="-mx-5"
						contentContainerStyle={{ paddingHorizontal: 20 }}
					>
						<Chip label="Todas" selected={category === ALL} onPress={() => applyCategory(ALL)} />
						{categoryOptions.map((option) => (
							<Chip
								key={option}
								label={categoryLabels[option]}
								selected={category === option}
								onPress={() => applyCategory(option)}
							/>
						))}
					</ScrollView>
				</View>

				<Section title="Por categoria">
					<View className="gap-5 p-4">
						<SegmentedControl
							options={[
								{ value: "expense", label: "Despesas" },
								{ value: "income", label: "Receitas" },
							]}
							value={chartType}
							onChange={setChartType}
						/>
						{statsQuery.isPending ? (
							<LoadingState />
						) : (
							<CategoryPieChart
								slices={slices}
								emptyLabel={
									chartType === "expense"
										? "Nenhuma despesa registrada ainda."
										: "Nenhuma receita registrada ainda."
								}
							/>
						)}
					</View>
				</Section>

				<View className="gap-2">
					<View className="flex-row items-baseline justify-between px-1">
						<Text className="text-caption font-semibold uppercase text-subtle">Últimas transações</Text>
						<Text className="text-caption text-subtle">{all.length} no total</Text>
					</View>
					<View className="overflow-hidden rounded-card bg-surface">
						{transactionsQuery.isPending ? (
							<LoadingState />
						) : transactionsQuery.isError ? (
							<EmptyState
								icon="wifi-off"
								title="Não foi possível carregar"
								description="Puxe para baixo para tentar de novo."
							/>
						) : visible.length === 0 ? (
							<EmptyState
								icon="inbox"
								title="Nenhuma transação"
								description="Ajuste os filtros ou toque em + para adicionar."
							/>
						) : (
							visible.map((transaction, index) => (
								<TransactionRow
									key={transaction.id}
									transaction={transaction}
									onPress={() => router.push(`/transaction/${transaction.id}`)}
									last={index === visible.length - 1}
								/>
							))
						)}
					</View>
					{all.length > visibleCount ? (
						<Button
							label={`Mostrar mais (${all.length - visibleCount})`}
							variant="ghost"
							size="md"
							onPress={() => setVisibleCount((count) => count + PAGE_SIZE)}
						/>
					) : null}
				</View>
			</ScrollView>

			<BottomNav active="home" />
		</Screen>
	);
}

function Stat({
	label,
	value,
	icon,
	color,
}: {
	label: string;
	value: number;
	icon: "arrow-down-left" | "arrow-up-right";
	color: string;
}) {
	return (
		<View className="flex-1 gap-2 rounded-card bg-surface p-4">
			<View className="flex-row items-center gap-2">
				<Feather name={icon} size={14} color={color} />
				<Text className="text-footnote text-muted">{label}</Text>
			</View>
			<Text className="text-headline text-fg" numberOfLines={1} adjustsFontSizeToFit>
				{formatBRL(value)}
			</Text>
		</View>
	);
}
