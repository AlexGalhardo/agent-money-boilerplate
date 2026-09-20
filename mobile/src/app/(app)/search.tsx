import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNav } from "@/components/ui/bottom-nav";
import { getCategoryColor, getCategoryLabel } from "@/lib/categories";
import { categoryIcon } from "@/lib/category-icons";
import { formatBRL, isoToBR } from "@/lib/format";
import { useAppColorScheme } from "@/lib/theme";
import { type Transaction, useDeleteTransaction, useTransactionsQuery } from "@/query/transactions";
import { Pressable } from "@/shared/components/atoms/pressable";

function normalizeSearchText(value: string): string {
	return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function SearchScreen() {
	const router = useRouter();
	const { isDark } = useAppColorScheme();
	const [query, setQuery] = useState("");

	const transactionsQuery = useTransactionsQuery({});
	const deleteMutation = useDeleteTransaction();

	const trimmed = query.trim();
	const results =
		trimmed.length >= 2
			? (transactionsQuery.data ?? []).filter((tx) =>
					normalizeSearchText(tx.description).includes(normalizeSearchText(trimmed)),
				)
			: [];

	function confirmDelete(tx: Transaction): void {
		Alert.alert("Excluir transação", `Deseja remover "${tx.description}"?`, [
			{ text: "Cancelar", style: "cancel" },
			{ text: "Excluir", style: "destructive", onPress: () => deleteMutation.mutate(tx.id) },
		]);
	}

	const iconMuted = isDark ? "#94a3b8" : "#64748b";

	return (
		<SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top", "left", "right"]}>
			<View className="flex-row items-center gap-3 px-6 pb-2 pt-2">
				<Pressable accessibilityLabel="Voltar" onPress={() => router.back()} hitSlop={8} style={{ padding: 4 }}>
					<Feather name="arrow-left" size={22} color={isDark ? "#f1f5f9" : "#0f172a"} />
				</Pressable>
				<Text className="text-xl font-bold text-slate-900 dark:text-white">Buscar transação</Text>
			</View>

			<View className="px-6 pb-4 pt-2">
				<View
					className="flex-row items-center gap-2 rounded-xl border px-4"
					style={{
						borderColor: isDark ? "#1e293b" : "#e2e8f0",
						backgroundColor: isDark ? "#0f172a" : "#ffffff",
					}}
				>
					<Feather name="search" size={18} color={iconMuted} />
					<TextInput
						value={query}
						onChangeText={setQuery}
						placeholder="Digite pelo menos 2 caracteres..."
						placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
						autoCapitalize="none"
						autoCorrect={false}
						testID="search-input"
						accessibilityLabel="Buscar transação"
						className="flex-1 py-3 text-base text-slate-900 dark:text-white"
					/>
					{query ? (
						<Pressable accessibilityLabel="Limpar busca" onPress={() => setQuery("")} hitSlop={8}>
							<Feather name="x-circle" size={18} color={iconMuted} />
						</Pressable>
					) : null}
				</View>
			</View>

			{trimmed.length >= 2 ? (
				<Text className="px-6 pb-2 text-sm text-slate-500 dark:text-slate-400">
					{results.length} {results.length === 1 ? "resultado encontrado" : "resultados encontrados"}
				</Text>
			) : null}

			<FlatList
				data={results}
				keyExtractor={(item) => item.id}
				contentContainerClassName="px-6 pb-40"
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
				ListEmptyComponent={
					transactionsQuery.isPending && trimmed.length >= 2 ? (
						<View className="items-center py-16">
							<ActivityIndicator />
						</View>
					) : trimmed.length >= 2 ? (
						<Animated.View
							entering={FadeInDown.duration(200)}
							className="items-center rounded-xl border border-dashed border-slate-300 bg-white py-12 dark:border-slate-700 dark:bg-slate-900"
						>
							<Text className="text-sm text-slate-500 dark:text-slate-400">
								Nenhum resultado encontrado.
							</Text>
						</Animated.View>
					) : null
				}
			/>

			<BottomNav active="search" />
		</SafeAreaView>
	);
}
