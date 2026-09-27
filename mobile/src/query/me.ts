import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const ME_QUERY_KEY = ["me"] as const;

export function useMeQuery() {
	return useQuery({
		queryKey: ME_QUERY_KEY,
		queryFn: async () => {
			const { data, error } = await api.users.me.get();
			if (error || !data || !("user" in data)) throw new Error("Falha ao carregar dados da conta");
			return data.user;
		},
	});
}

export function useRefreshMe(): () => Promise<void> {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
}
