import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { BottomNav } from "@/components/ui/bottom-nav";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { TransactionRow } from "@/components/ui/transaction-row";
import { formatBRL } from "@/lib/format";
import { matchesSearch, totals } from "@/lib/transaction-math";
import { useTransactionsQuery } from "@/query/transactions";
import { colors } from "@/theme";

const MIN_QUERY_LENGTH = 2;

export default function SearchScreen() {
	const router = useRouter();
	const [query, setQuery] = useState("");
	const transactionsQuery = useTransactionsQuery({});

	const searching = query.trim().length >= MIN_QUERY_LENGTH;
	const results = searching
		? (transactionsQuery.data ?? []).filter((tx) => matchesSearch(tx.description, query))
		: [];
	const summary = totals(results);

	return (
		<Screen edges={["left", "right"]}>
			<View className="px-5 pb-3 pt-2">
				<View className="h-12 flex-row items-center gap-3 rounded-control bg-raised px-4">
					<Feather name="search" size={17} color={colors.subtle} />
					<TextInput
						value={query}
						onChangeText={setQuery}
						placeholder="Buscar pela descrição"
						placeholderTextColor={colors.subtle}
						selectionColor={colors.brand}
						autoCapitalize="none"
						autoCorrect={false}
						autoFocus
						returnKeyType="search"
						testID="search-input"
						accessibilityLabel="Buscar transação"
						className="h-full flex-1 text-body text-fg web:outline-none"
					/>
					{query ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Limpar busca"
							onPress={() => setQuery("")}
							hitSlop={10}
							className="active:opacity-60"
						>
							<Feather name="x-circle" size={17} color={colors.subtle} />
						</Pressable>
					) : null}
				</View>
			</View>

			<ScrollView contentContainerClassName="gap-3 px-5 pb-8" keyboardShouldPersistTaps="handled">
				{searching && results.length > 0 ? (
					<View className="flex-row items-center justify-between px-1">
						<Text className="text-caption font-semibold uppercase text-subtle">
							{results.length} {results.length === 1 ? "resultado" : "resultados"}
						</Text>
						<Text className="text-caption text-subtle">
							<Text className="text-income">+{formatBRL(summary.income)}</Text>
							{"  "}−{formatBRL(summary.expense)}
						</Text>
					</View>
				) : null}

				<View className="overflow-hidden rounded-card bg-surface">
					{!searching ? (
						<EmptyState
							icon="search"
							title="Buscar transações"
							description={`Digite pelo menos ${MIN_QUERY_LENGTH} caracteres da descrição.`}
						/>
					) : transactionsQuery.isPending ? (
						<LoadingState />
					) : results.length === 0 ? (
						<EmptyState icon="inbox" title="Nenhum resultado" description="Tente outro termo." />
					) : (
						results.map((transaction, index) => (
							<TransactionRow
								key={transaction.id}
								transaction={transaction}
								onPress={() => router.push(`/transaction/${transaction.id}`)}
								last={index === results.length - 1}
							/>
						))
					)}
				</View>
			</ScrollView>

			<BottomNav active="search" />
		</Screen>
	);
}
