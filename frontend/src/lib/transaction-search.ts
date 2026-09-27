import type { Transaction } from "./queries";

export const MIN_SEARCH_LENGTH = 3;

// Strips accents and case so a term matches anywhere in the description —
// bank-statement descriptions are long and the term is often mid-string,
// where positional fuzzy search (fuse.js style) fails.
export function normalizeSearchText(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
}

export function searchTransactions(transactions: Transaction[], term: string): Transaction[] {
	const trimmed = term.trim();
	if (trimmed.length < MIN_SEARCH_LENGTH) return transactions;
	const needle = normalizeSearchText(trimmed);
	return transactions.filter((transaction) => normalizeSearchText(transaction.description).includes(needle));
}

export function sumByType(transactions: Transaction[], type: Transaction["type"]): number {
	return transactions.filter((transaction) => transaction.type === type).reduce((sum, t) => sum + t.amount, 0);
}

export function paginate<T>(
	items: T[],
	page: number,
	perPage: number,
): { items: T[]; page: number; totalPages: number } {
	const totalPages = Math.max(1, Math.ceil(items.length / perPage));
	const current = Math.min(Math.max(1, page), totalPages);
	return { items: items.slice((current - 1) * perPage, current * perPage), page: current, totalPages };
}
