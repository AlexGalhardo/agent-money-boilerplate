import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { TransactionCategory } from "./categories";

export type Transaction = {
	id: string;
	description: string;
	amount: number;
	category: TransactionCategory;
	type: "income" | "expense";
	date: string;
	createdAt: string;
	updatedAt: string | null;
};

export type TransactionServerFilters = { category?: TransactionCategory; from?: string; to?: string };

// Text search happens client-side (descriptions are encrypted at rest), so
// the server returns the whole set already narrowed by category/date — not
// a single page — and search + pagination run over all of it.
const FETCH_ALL_PER_PAGE = 1000;

export const queryKeys = {
	me: ["me"],
	transactions: ["transactions"],
	statistics: ["transactions-statistics"],
} as const;

export function useMeQuery() {
	return useQuery({
		queryKey: queryKeys.me,
		queryFn: async () => {
			const { data, error } = await api.users.me.get();
			if (error || !data || !("user" in data)) throw error ?? new Error("Falha ao carregar dados da conta");
			return data.user;
		},
	});
}

export function useTransactionsQuery(filters: TransactionServerFilters) {
	const query = { ...filters, page: 1, perPage: FETCH_ALL_PER_PAGE };
	return useQuery({
		queryKey: [...queryKeys.transactions, query],
		queryFn: async () => {
			const { data, error } = await api.transactions.get({ query });
			if (error || !("transactions" in data)) throw error ?? new Error("Falha ao carregar transações");
			return data.transactions as Transaction[];
		},
	});
}

export function useStatisticsQuery() {
	return useQuery({
		queryKey: queryKeys.statistics,
		queryFn: async () => {
			const { data, error } = await api.transactions.statistics.get();
			if (error || !("stats" in data)) throw error ?? new Error("Falha ao carregar estatísticas");
			return data.stats;
		},
	});
}

/** Everything derived from transactions: the list, the charts and the free-plan counter. */
export function useInvalidateFinanceData(): () => void {
	const queryClient = useQueryClient();
	return () => {
		for (const key of Object.values(queryKeys)) queryClient.invalidateQueries({ queryKey: key });
	};
}
