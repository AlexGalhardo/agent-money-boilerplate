import type { Transaction, TransactionFiltersQuery, TransactionInput } from "@op/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { repos } from "@/data";
import { qk } from "./client";

export function useTransactionsQuery(filters: TransactionFiltersQuery) {
	return useQuery({
		queryKey: qk.transactions(filters),
		queryFn: () => repos.transactions.list(filters),
		placeholderData: (prev) => prev,
	});
}

export function useTransactionQuery(id: string, enabled = true) {
	return useQuery({
		queryKey: qk.transaction(id),
		queryFn: () => repos.transactions.get(id),
		enabled: enabled && !!id && id !== "new",
	});
}

function invalidateLists(qc: ReturnType<typeof useQueryClient>) {
	return qc.invalidateQueries({ queryKey: ["transactions"] });
}

export function useCreateTransaction() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: TransactionInput & { id?: string }) => repos.transactions.create(input),
		onSuccess: () => invalidateLists(qc),
	});
}

export function useUpdateTransaction() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: TransactionInput }) => repos.transactions.update(id, input),
		onSuccess: (updated: Transaction) => {
			qc.setQueryData(qk.transaction(updated.id), updated);
			return invalidateLists(qc);
		},
	});
}

export function useDeleteTransaction() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => repos.transactions.remove(id),
		onSuccess: () => invalidateLists(qc),
	});
}
