import {
	type Currency,
	PLAN_PRICING,
	type PlanId,
	type PublicUser,
	type Transaction,
	type TransactionFiltersQuery,
	type TransactionInput,
	type TransactionListResponse,
} from "@op/shared";

import {
	clearSession,
	changePassword as dbChangePassword,
	signIn as dbSignIn,
	signUp as dbSignUp,
	updateDisplayName as dbUpdateDisplayName,
	getSessionUser,
} from "@/lib/auth";
import {
	createTransaction,
	deleteTransaction,
	getTransaction,
	type Transaction as LocalTx,
	type TransactionInput as LocalTxInput,
	listTransactionsPage,
	summarizeFiltered,
	updateTransaction,
} from "@/lib/transactions";
import type { AuthRepo, Repos, SubscriptionRepo, TransactionRepo } from "../types";

/**
 * Offline-first implementation over the on-device SQLite database. It is fully
 * self-contained: no network, no real 2FA, and billing is unavailable (the
 * subscription screen tells the user to switch to online mode). Client-supplied
 * transaction ids are ignored here — identity only needs to survive sync in
 * remote mode.
 */

function toPublicUser(u: { id: number; email: string; name: string }): PublicUser {
	return {
		id: String(u.id),
		email: u.email,
		name: u.name,
		twoFactorEnabled: false,
		createdAt: new Date().toISOString(),
	};
}

function sessionUserId(user: PublicUser | null): number {
	if (!user) throw new Error("Sessão local não encontrada.");
	return Number(user.id);
}

function toContractTx(row: LocalTx): Transaction {
	return {
		id: String(row.id),
		type: row.type,
		amountCents: row.amount_cents,
		category: row.category,
		description: row.description,
		date: row.date.slice(0, 10),
		createdAt: row.created_at,
		updatedAt: row.created_at,
	};
}

function toLocalInput(input: TransactionInput): LocalTxInput {
	return {
		type: input.type,
		amount_cents: input.amountCents,
		category: input.category,
		description: input.description ?? "",
		date: input.date,
	};
}

let cachedUser: PublicUser | null = null;

const authRepo: AuthRepo = {
	async restore() {
		const u = await getSessionUser();
		cachedUser = u ? toPublicUser(u) : null;
		return cachedUser ? { user: cachedUser } : null;
	},
	async signUp(input) {
		const u = await dbSignUp(input.email, input.password);
		cachedUser = toPublicUser(u);
		return {
			user: cachedUser,
			tokens: { accessToken: "local", refreshToken: "local", expiresIn: 0 },
		};
	},
	async signIn(input) {
		const u = await dbSignIn(input.email, input.password);
		cachedUser = toPublicUser(u);
		return {
			user: cachedUser,
			tokens: { accessToken: "local", refreshToken: "local", expiresIn: 0 },
		};
	},
	async signOut() {
		await clearSession();
		cachedUser = null;
	},
	async updateName(name) {
		const u = await dbUpdateDisplayName(sessionUserId(cachedUser), name);
		cachedUser = toPublicUser(u);
		return cachedUser;
	},
	async changePassword(currentPassword, newPassword) {
		await dbChangePassword(sessionUserId(cachedUser), currentPassword, newPassword);
	},
	async forgotPassword() {
		throw new Error("Recuperação de senha por e-mail só está disponível no modo online.");
	},
	async resetPassword() {
		throw new Error("Redefinição de senha só está disponível no modo online.");
	},
	async me() {
		if (!cachedUser) throw new Error("Sessão local não encontrada.");
		return cachedUser;
	},
};

const transactionRepo: TransactionRepo = {
	async list(query: TransactionFiltersQuery): Promise<TransactionListResponse> {
		const userId = sessionUserId(cachedUser);
		const filters = {
			category: query.category,
			search: query.search,
			startDate: query.startDate,
			endDate: query.endDate,
		};
		const [page, balance] = await Promise.all([
			listTransactionsPage(userId, filters, query.page, query.pageSize),
			summarizeFiltered(userId, filters),
		]);
		return {
			page: {
				items: page.items.map(toContractTx),
				total: page.total,
				page: page.page,
				pageCount: page.pageCount,
				pageSize: page.pageSize,
			},
			balance,
		};
	},
	async get(id) {
		const row = await getTransaction(sessionUserId(cachedUser), Number(id));
		if (!row) throw new Error("Transação não encontrada.");
		return toContractTx(row);
	},
	async create(input) {
		const userId = sessionUserId(cachedUser);
		await createTransaction(userId, toLocalInput(input));
		const page = await listTransactionsPage(userId, {}, 1, 1);
		return toContractTx(page.items[0]!);
	},
	async update(id, input: TransactionInput) {
		const userId = sessionUserId(cachedUser);
		await updateTransaction(userId, Number(id), toLocalInput(input));
		const row = await getTransaction(userId, Number(id));
		return toContractTx(row!);
	},
	async remove(id) {
		await deleteTransaction(sessionUserId(cachedUser), Number(id));
	},
};

const billingUnavailable = () => {
	throw new Error("Assinaturas exigem o modo online. Gere um build com EXPO_PUBLIC_DATA_MODE=remote.");
};

const subscriptionRepo: SubscriptionRepo = {
	supportsBilling: false,
	async plans() {
		return {
			plans: (Object.keys(PLAN_PRICING) as PlanId[]).map((id) => ({
				id,
				label: id === "monthly" ? "Mensal" : "Anual",
				interval: id === "monthly" ? ("month" as const) : ("year" as const),
				prices: (Object.keys(PLAN_PRICING[id]) as Currency[]).map((currency) => ({
					currency,
					amountCents: PLAN_PRICING[id][currency],
				})),
			})),
		};
	},
	async current() {
		return { subscription: null, isPremium: false };
	},
	checkout: billingUnavailable,
	cancel: billingUnavailable,
};

export const localRepos: Repos = {
	auth: authRepo,
	transactions: transactionRepo,
	subscriptions: subscriptionRepo,
};
