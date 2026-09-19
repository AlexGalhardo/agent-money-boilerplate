import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";

/**
 * Shared client. Retries transient failures but never a 4xx (a validation or
 * auth error won't fix itself). In local mode queries still flow through here so
 * screens are identical across modes.
 */
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			gcTime: 5 * 60_000,
			retry: (failureCount, error) => {
				if (error instanceof ApiError && error.status < 500) return false;
				return failureCount < 2;
			},
		},
		mutations: { retry: 0 },
	},
});

export const qk = {
	session: ["session"] as const,
	transactions: (filters: unknown) => ["transactions", filters] as const,
	transaction: (id: string) => ["transactions", "one", id] as const,
	subscription: ["subscription"] as const,
	plans: ["subscription", "plans"] as const,
};
