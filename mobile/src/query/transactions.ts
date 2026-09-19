import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TransactionCategory } from "@/lib/categories";

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

export type TransactionInput = {
	description: string;
	amount: number;
	category: TransactionCategory;
	type: "income" | "expense";
	date: string;
};

// Mesma estratégia do dashboard web (ver frontend/src/routes/dashboard/index.tsx):
// busca até 1000 transações já filtradas por categoria/data no servidor, e
// faz busca por texto + paginação no cliente por cima desse conjunto.
const FETCH_ALL_PER_PAGE = 1000;

export function useTransactionsQuery(filters: { category?: TransactionCategory; from?: string; to?: string }) {
	return useQuery({
		queryKey: ["transactions", filters],
		queryFn: async () => {
			const { data, error } = await api.transactions.get({
				query: { ...filters, page: 1, perPage: FETCH_ALL_PER_PAGE },
			});
			if (error || !data || !("transactions" in data)) throw new Error("Falha ao carregar transações");
			return data.transactions as Transaction[];
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
			return data.transaction as Transaction;
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
