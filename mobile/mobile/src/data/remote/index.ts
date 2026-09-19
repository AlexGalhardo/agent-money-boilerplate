import type {
	AuthSession,
	CancelSubscriptionRequest,
	CheckoutRequest,
	CheckoutResponse,
	MessageResponse,
	PlansResponse,
	PublicUser,
	SignInResponse,
	SubscriptionResponse,
	Transaction,
	TransactionFiltersQuery,
	TransactionInput,
	TransactionListResponse,
} from "@op/shared";

import { apiClient, setSessionTokens } from "@/api/client";
import { clearTokens, loadTokens, saveTokens } from "@/api/tokens";
import type { AuthRepo, Repos, SubscriptionRepo, TransactionRepo } from "../types";

const authRepo: AuthRepo = {
	async restore() {
		const tokens = await loadTokens();
		if (!tokens) return null;
		setSessionTokens(tokens);
		try {
			return { user: await apiClient.get<PublicUser>("/auth/me") };
		} catch {
			await clearTokens();
			setSessionTokens(null);
			return null;
		}
	},
	async signUp(input) {
		const session = await apiClient.post<AuthSession>("/auth/signup", input, false);
		await saveTokens(session.tokens);
		setSessionTokens(session.tokens);
		return session;
	},
	async signIn(input) {
		const res = await apiClient.post<SignInResponse>("/auth/login", input, false);
		if ("tokens" in res) {
			await saveTokens(res.tokens);
			setSessionTokens(res.tokens);
		}
		return res;
	},
	async signOut() {
		const tokens = await loadTokens();
		if (tokens) {
			await apiClient
				.post<MessageResponse>("/auth/logout", {
					refreshToken: tokens.refreshToken,
				})
				.catch(() => undefined);
		}
		await clearTokens();
		setSessionTokens(null);
	},
	updateName: (name) => apiClient.patch<PublicUser>("/auth/me", { name }),
	async changePassword(currentPassword, newPassword) {
		await apiClient.post<MessageResponse>("/auth/change-password", {
			currentPassword,
			newPassword,
		});
	},
	forgotPassword: (email) => apiClient.post<{ devToken?: string }>("/auth/forgot-password", { email }, false),
	async resetPassword(token, password) {
		await apiClient.post<MessageResponse>("/auth/reset-password", { token, password }, false);
	},
	me: () => apiClient.get<PublicUser>("/auth/me"),
};

const transactionRepo: TransactionRepo = {
	list: (query: TransactionFiltersQuery) =>
		apiClient.get<TransactionListResponse>("/transactions", {
			category: query.category,
			search: query.search,
			startDate: query.startDate,
			endDate: query.endDate,
			page: query.page,
			pageSize: query.pageSize,
		}),
	get: (id) => apiClient.get<Transaction>(`/transactions/${id}`),
	create: (input) => apiClient.post<Transaction>("/transactions", input),
	update: (id, input: TransactionInput) => apiClient.put<Transaction>(`/transactions/${id}`, input),
	async remove(id) {
		await apiClient.del<MessageResponse>(`/transactions/${id}`);
	},
};

const subscriptionRepo: SubscriptionRepo = {
	supportsBilling: true,
	plans: () => apiClient.get<PlansResponse>("/subscriptions/plans"),
	current: () => apiClient.get<SubscriptionResponse>("/subscriptions/me"),
	checkout: (input: CheckoutRequest) => apiClient.post<CheckoutResponse>("/subscriptions/checkout", input),
	cancel: (input: CancelSubscriptionRequest) => apiClient.post<SubscriptionResponse>("/subscriptions/cancel", input),
};

export const remoteRepos: Repos = {
	auth: authRepo,
	transactions: transactionRepo,
	subscriptions: subscriptionRepo,
};
