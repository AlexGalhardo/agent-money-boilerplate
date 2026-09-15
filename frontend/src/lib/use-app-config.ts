import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function useAppConfig() {
	return useQuery({
		queryKey: ["app-config"],
		queryFn: async () => {
			const { data, error } = await api.config.get();
			if (error || !data || !("config" in data)) throw error ?? new Error("Falha ao carregar configuração");
			return data.config;
		},
		staleTime: Number.POSITIVE_INFINITY,
	});
}
