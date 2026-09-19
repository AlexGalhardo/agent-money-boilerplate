import { ALL_CATEGORIES } from "./categories";
import { getDb } from "./db";

export type TxType = "income" | "expense";

export type Transaction = {
	id: number;
	user_id: number;
	type: TxType;
	amount_cents: number;
	category: string;
	description: string;
	date: string;
	created_at: string;
};

export type TransactionInput = {
	type: TxType;
	amount_cents: number;
	category: string;
	description: string;
	date: string;
};

export type TransactionFilters = {
	category?: string;
	search?: string;
	startDate?: string;
	endDate?: string;
};

export type TransactionPage = {
	items: Transaction[];
	total: number;
	page: number;
	pageCount: number;
	pageSize: number;
};

export const PAGE_SIZE = 10;

function buildWhere(userId: number, filters: TransactionFilters) {
	const clauses: string[] = ["user_id = ?"];
	const params: (string | number)[] = [userId];

	if (filters.category && filters.category !== ALL_CATEGORIES) {
		clauses.push("category = ?");
		params.push(filters.category);
	}
	if (filters.search?.trim()) {
		clauses.push("LOWER(description) LIKE ?");
		params.push(`%${filters.search.trim().toLowerCase()}%`);
	}
	if (filters.startDate) {
		clauses.push("date >= ?");
		params.push(filters.startDate);
	}
	if (filters.endDate) {
		clauses.push("date <= ?");
		params.push(filters.endDate);
	}

	return { where: clauses.join(" AND "), params };
}

export async function listTransactions(userId: number, category?: string): Promise<Transaction[]> {
	const db = await getDb();
	if (category && category !== ALL_CATEGORIES) {
		return db.getAllAsync<Transaction>(
			"SELECT * FROM transactions WHERE user_id = ? AND category = ? ORDER BY date DESC, id DESC",
			userId,
			category,
		);
	}
	return db.getAllAsync<Transaction>(
		"SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC",
		userId,
	);
}

export async function listTransactionsPage(
	userId: number,
	filters: TransactionFilters,
	page: number,
	pageSize: number = PAGE_SIZE,
): Promise<TransactionPage> {
	const db = await getDb();
	const { where, params } = buildWhere(userId, filters);

	const countRow = await db.getFirstAsync<{ count: number }>(
		`SELECT COUNT(*) as count FROM transactions WHERE ${where}`,
		...params,
	);
	const total = countRow?.count ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	const safePage = Math.min(Math.max(1, page), pageCount);
	const offset = (safePage - 1) * pageSize;

	const items = await db.getAllAsync<Transaction>(
		`SELECT * FROM transactions WHERE ${where} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`,
		...params,
		pageSize,
		offset,
	);

	return { items, total, page: safePage, pageCount, pageSize };
}

export async function getTransaction(userId: number, id: number): Promise<Transaction | null> {
	const db = await getDb();
	const row = await db.getFirstAsync<Transaction>(
		"SELECT * FROM transactions WHERE id = ? AND user_id = ?",
		id,
		userId,
	);
	return row ?? null;
}

export async function createTransaction(userId: number, input: TransactionInput): Promise<void> {
	const db = await getDb();
	await db.runAsync(
		`INSERT INTO transactions
       (user_id, type, amount_cents, category, description, date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
		userId,
		input.type,
		input.amount_cents,
		input.category,
		input.description,
		input.date,
		new Date().toISOString(),
	);
}

export async function updateTransaction(userId: number, id: number, input: TransactionInput): Promise<void> {
	const db = await getDb();
	await db.runAsync(
		`UPDATE transactions
        SET type = ?, amount_cents = ?, category = ?, description = ?, date = ?
      WHERE id = ? AND user_id = ?`,
		input.type,
		input.amount_cents,
		input.category,
		input.description,
		input.date,
		id,
		userId,
	);
}

export async function deleteTransaction(userId: number, id: number): Promise<void> {
	const db = await getDb();
	await db.runAsync("DELETE FROM transactions WHERE id = ? AND user_id = ?", id, userId);
}

export type Balance = { income: number; expense: number; balance: number };

export function summarize(transactions: Transaction[]): Balance {
	let income = 0;
	let expense = 0;
	for (const t of transactions) {
		if (t.type === "income") income += t.amount_cents;
		else expense += t.amount_cents;
	}
	return { income, expense, balance: income - expense };
}

export async function summarizeFiltered(userId: number, filters: TransactionFilters): Promise<Balance> {
	const db = await getDb();
	const { where, params } = buildWhere(userId, filters);
	const rows = await db.getAllAsync<{ type: TxType; total: number }>(
		`SELECT type, SUM(amount_cents) as total FROM transactions WHERE ${where} GROUP BY type`,
		...params,
	);
	let income = 0;
	let expense = 0;
	for (const row of rows) {
		if (row.type === "income") income = row.total ?? 0;
		else expense = row.total ?? 0;
	}
	return { income, expense, balance: income - expense };
}
