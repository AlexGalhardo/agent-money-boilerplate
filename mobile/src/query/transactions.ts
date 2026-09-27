import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TransactionCategory } from "@/lib/categories";
import { normalizeTransaction, type Transaction } from "./normalize";

export type { Transaction };

export type TransactionInput = {
	description: string;
	amount: number;
	category: TransactionCategory;
	type: "income" | "expense";
	date: string;
};

// Same strategy as the web dashboard (frontend/src/lib/queries.ts): fetch up
// to 1000 transactions already filtered by category/date on the server, then
// search + paginate on the client (descriptions are encrypted at rest).
const FETCH_ALL_PER_PAGE = 1000;

export function useTransactionsQuery(filters: { category?: TransactionCategory; from?: string; to?: string }) {
	return useQuery({
		queryKey: ["transactions", filters],
		queryFn: async () => {
			const { data, error } = await api.transactions.get({
				query: { ...filters, page: 1, perPage: FETCH_ALL_PER_PAGE },
			});
			if (error || !data || !("transactions" in data)) throw new Error("Falha ao carregar transações");
			return data.transactions.map(normalizeTransaction);
		},
	});
}

export function useTransactionStatistics() {
	return useQuery({
		queryKey: ["transactions-statistics"],
		queryFn: async () => {
			const { data, error } = await api.transactions.statistics.get();
			if (error || !data || !("stats" in data)) throw new Error("Falha ao carregar estatísticas");
			return data.stats;
		},
	});
}

export function useTransactionQuery(id: string, enabled: boolean) {
	return useQuery({
		queryKey: ["transaction", id],
		enabled,
		queryFn: async () => {
			const { data, error } = await api.transactions({ id }).get();
			if (error || !data || !("transaction" in data)) throw new Error("Transação não encontrada");
			return normalizeTransaction(data.transaction);
		},
	});
}

function useInvalidateTransactions() {
	const queryClient = useQueryClient();
	return () => {
		queryClient.invalidateQueries({ queryKey: ["transactions"] });
		queryClient.invalidateQueries({ queryKey: ["transactions-statistics"] });
		queryClient.invalidateQueries({ queryKey: ["me"] });
	};
}

export function useCreateTransaction() {
	const invalidate = useInvalidateTransactions();
	return useMutation({
		mutationFn: async (input: TransactionInput) => {
			const { data, error } = await api.transactions.post(input);
			if (error) throw error;
			return data;
		},
		onSuccess: invalidate,
	});
}

export function useUpdateTransaction() {
	const invalidate = useInvalidateTransactions();
	return useMutation({
		mutationFn: async ({ id, input }: { id: string; input: TransactionInput }) => {
			const { data, error } = await api.transactions({ id }).put(input);
			if (error) throw error;
			return data;
		},
		onSuccess: invalidate,
	});
}

export function useDeleteTransaction() {
	const invalidate = useInvalidateTransactions();
	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await api.transactions({ id }).delete();
			if (error) throw error;
		},
		onSuccess: invalidate,
	});
}
