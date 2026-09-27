type Summable = { type: "income" | "expense"; amount: number };

// Strips accents and case so a term matches anywhere in the description —
// bank-statement descriptions are long and the term is often mid-string.
export function normalizeSearchText(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
}

export function matchesSearch(description: string, term: string): boolean {
	return normalizeSearchText(description).includes(normalizeSearchText(term.trim()));
}

export function totals(transactions: Summable[]): { income: number; expense: number; balance: number } {
	let income = 0;
	let expense = 0;
	for (const transaction of transactions) {
		if (transaction.type === "income") income += transaction.amount;
		else expense += transaction.amount;
	}
	return { income, expense, balance: income - expense };
}
