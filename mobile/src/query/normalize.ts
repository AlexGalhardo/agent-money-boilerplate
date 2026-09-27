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

// Eden's treaty client revives ISO-8601 strings in JSON responses into Date
// objects at runtime, even though the inferred type says `string` — screens
// calling string methods on `date` crashed. Normalize at the query boundary.
function toISO(value: unknown): string {
	return value instanceof Date ? value.toISOString() : String(value);
}

type RawTransaction = Omit<Transaction, "date" | "createdAt" | "updatedAt"> & {
	date: unknown;
	createdAt: unknown;
	updatedAt: unknown;
};

export function normalizeTransaction(raw: RawTransaction): Transaction {
	return {
		...raw,
		date: toISO(raw.date),
		createdAt: toISO(raw.createdAt),
		updatedAt: raw.updatedAt == null ? null : toISO(raw.updatedAt),
	};
}
