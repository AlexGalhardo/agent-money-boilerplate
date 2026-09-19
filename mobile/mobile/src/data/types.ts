import type {
	AuthSession,
	CancelSubscriptionRequest,
	CheckoutRequest,
	CheckoutResponse,
	PlansResponse,
	PublicUser,
	SignInResponse,
	SubscriptionResponse,
	Transaction,
	TransactionFiltersQuery,
	TransactionInput,
	TransactionListResponse,
} from "@op/shared";

/**
 * The app talks to these interfaces only. `local/` implements them against the
 * on-device SQLite database (offline-first); `remote/` implements them against
 * the deployed API. `data/index.ts` picks one from `EXPO_PUBLIC_DATA_MODE`.
 */

export interface AuthRepo {
	/** Restore a persisted session, or null. */
	restore(): Promise<{ user: PublicUser } | null>;
	signUp(input: { email: string; password: string; name?: string }): Promise<AuthSession>;
	signIn(input: { email: string; password: string; totp?: string }): Promise<SignInResponse>;
	signOut(): Promise<void>;
	updateName(name: string): Promise<PublicUser>;
	changePassword(currentPassword: string, newPassword: string): Promise<void>;
	forgotPassword(email: string): Promise<{ devToken?: string }>;
	resetPassword(token: string, password: string): Promise<void>;
	me(): Promise<PublicUser>;
}

export interface TransactionRepo {
	list(query: TransactionFiltersQuery): Promise<TransactionListResponse>;
	get(id: string): Promise<Transaction>;
	create(input: TransactionInput & { id?: string }): Promise<Transaction>;
	update(id: string, input: TransactionInput): Promise<Transaction>;
	remove(id: string): Promise<void>;
}

export interface SubscriptionRepo {
	/** True when this repo can actually process payments (remote mode only). */
	readonly supportsBilling: boolean;
	plans(): Promise<PlansResponse>;
	current(): Promise<SubscriptionResponse>;
	checkout(input: CheckoutRequest): Promise<CheckoutResponse>;
	cancel(input: CancelSubscriptionRequest): Promise<SubscriptionResponse>;
}

export type Repos = {
	auth: AuthRepo;
	transactions: TransactionRepo;
	subscriptions: SubscriptionRepo;
};
