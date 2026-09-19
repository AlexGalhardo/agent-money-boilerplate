import { ALL_CATEGORIES, ALL_CATEGORY_NAMES, type Transaction } from "@op/shared";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DateField } from "@/components/ui/date-field";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/context/auth";
import { formatBRL, isoToBR } from "@/lib/format";
import { useDeleteTransaction, useTransactionsQuery } from "@/query/transactions";

const FILTERS = [ALL_CATEGORIES, ...ALL_CATEGORY_NAMES];

export default function DashboardScreen() {
	const router = useRouter();
	const { user, signOut } = useAuth();

	const [filter, setFilter] = useState<string>(ALL_CATEGORIES);
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [startDate, setStartDate] = useState<string | null>(null);
	const [endDate, setEndDate] = useState<string | null>(null);
	const [page, setPage] = useState(1);

	useEffect(() => {
		const handle = setTimeout(() => setSearch(searchInput.trim()), 300);
		return () => clearTimeout(handle);
	}, [searchInput]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reseta a página sempre que os filtros mudam, mesmo sem lê-los no corpo do efeito.
	useEffect(() => {
		setPage(1);
	}, [filter, search, startDate, endDate]);

	const filters = useMemo(
		() => ({
			category: filter === ALL_CATEGORIES ? undefined : filter,
			search: search || undefined,
			startDate: startDate ?? undefined,
			endDate: endDate ?? undefined,
			page,
			pageSize: 10,
		}),
		[filter, search, startDate, endDate, page],
	);

	const { data, isPending, isFetching } = useTransactionsQuery(filters);
	const del = useDeleteTransaction();

	const items = data?.page.items ?? [];
	const totals = data?.balance ?? { income: 0, expense: 0, balance: 0 };
	const pageCount = data?.page.pageCount ?? 1;
	const total = data?.page.total ?? 0;

	useEffect(() => {
		if (data && data.page.page !== page) setPage(data.page.page);
	}, [data, page]);

	const confirmDelete = (tx: Transaction) => {
		Alert.alert("Excluir transação", `Deseja remover "${tx.description || tx.category}"?`, [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Excluir",
				style: "destructive",
				onPress: () => del.mutate(tx.id),
			},
		]);
	};

	const hasDateRange = !!startDate || !!endDate;

	return (
		<SafeAreaView className="flex-1 bg-slate-50" edges={["top", "left", "right"]}>
			<View className="flex-row items-center justify-between px-6 pb-2 pt-2">
				<View className="flex-1 pr-3">
					<Text className="text-xs text-slate-500">Conectado como</Text>
					<Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>
						{user?.name || user?.email}
					</Text>
				</View>
				<Pressable
					onPress={() => router.push("/subscription")}
					className="rounded-lg px-3 py-2 active:bg-slate-200"
				>
					<Text className="text-sm font-semibold text-blue-600">Plano</Text>
				</Pressable>
				<Pressable onPress={() => router.push("/profile")} className="rounded-lg px-3 py-2 active:bg-slate-200">
					<Text className="text-sm font-semibold text-blue-600">Perfil</Text>
				</Pressable>
				<Pressable onPress={signOut} className="rounded-lg px-3 py-2 active:bg-slate-200">
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
							layout={LinearTransition.duration(200)}
							className="mt-2 rounded-2xl bg-slate-900 p-5"
						>
							<Text className="text-sm text-slate-300">Saldo do período</Text>
							<Text
								className={`mt-1 text-3xl font-bold ${
									totals.balance < 0 ? "text-red-400" : "text-emerald-400"
								}`}
							>
								{formatBRL(totals.balance)}
							</Text>
							<View className="mt-4 flex-row gap-3">
								<View className="flex-1 rounded-xl bg-white/10 p-3">
									<Text className="text-xs text-slate-300">Receitas</Text>
									<Text className="mt-1 text-base font-semibold text-emerald-300">
										{formatBRL(totals.income)}
									</Text>
								</View>
								<View className="flex-1 rounded-xl bg-white/10 p-3">
									<Text className="text-xs text-slate-300">Despesas</Text>
									<Text className="mt-1 text-base font-semibold text-red-300">
										{formatBRL(totals.expense)}
									</Text>
								</View>
							</View>
						</Animated.View>

						<View className="mt-4 gap-3">
							<TextField
								label="Buscar"
								value={searchInput}
								onChangeText={setSearchInput}
								placeholder="Descrição da transação"
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
							{FILTERS.map((option) => (
								<Chip
									key={option}
									label={option}
									selected={filter === option}
									onPress={() => setFilter(option)}
								/>
							))}
						</ScrollView>

						<View className="flex-row items-center justify-between pb-1">
							<Text className="text-sm font-semibold text-slate-500">
								Transações {isFetching ? "·" : ""}
							</Text>
							<Text className="text-xs text-slate-400">
								{total} no total
								{filter !== ALL_CATEGORIES || search || hasDateRange ? " (filtrado)" : ""}
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
							className="mb-2 flex-row items-center rounded-xl border border-slate-200 bg-white p-4 active:bg-slate-100"
						>
							<View className="flex-1 pr-3">
								<Text className="text-base font-medium text-slate-900" numberOfLines={1}>
									{item.description || item.category}
								</Text>
								<Text className="mt-0.5 text-xs text-slate-500">
									{item.category} · {isoToBR(item.date)}
								</Text>
							</View>
							<View className="items-end">
								<Text
									className={`text-base font-semibold ${
										item.type === "income" ? "text-emerald-600" : "text-red-600"
									}`}
								>
									{item.type === "income" ? "+ " : "− "}
									{formatBRL(item.amountCents)}
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
								disabled={page <= 1}
							/>
							<Text className="text-sm font-medium text-slate-600">
								Página {page} de {pageCount}
							</Text>
							<Button
								label="Próxima"
								variant="secondary"
								onPress={() => setPage((p) => Math.min(pageCount, p + 1))}
								disabled={page >= pageCount}
							/>
						</View>
					) : null
				}
				ListEmptyComponent={
					isPending ? (
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
								Ajuste os filtros ou toque em “Nova transação”.
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
