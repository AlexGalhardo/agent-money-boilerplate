import type {
	TransactionCategory,
	TransactionType,
} from "@elysia-galhardo-finances/backend/src/modules/transactions/transaction.schema";

// Mesmos rótulos usados no dashboard web (frontend/src/lib/categories.ts) —
// duplicado aqui de propósito: o bot não deve depender do workspace do
// frontend (React/TanStack) só por causa de um mapa de strings.
export const categoryLabels: Record<TransactionCategory, string> = {
	food: "Alimentação",
	transport: "Transporte",
	housing: "Moradia",
	health: "Saúde",
	education: "Educação",
	entertainment: "Lazer",
	shopping: "Compras",
	salary: "Salário",
	investment: "Investimentos",
	rental_income: "Aluguel",
	extra_income: "Renda Extra",
	freelancer: "Freelancer",
	gifts: "Presentes",
	prizes: "Prêmios",
	transfers: "Transferências",
	credit_card_bill: "Fatura do cartão",
	insurance: "Seguro",
	other: "Outros",
};

export function getCategoryLabel(category: string): string {
	return category in categoryLabels ? categoryLabels[category as TransactionCategory] : category;
}

export function formatCurrencyCents(cents: number): string {
	return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(date: Date | string): string {
	const value = typeof date === "string" ? new Date(date) : date;
	return value.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export type FormattableTransaction = {
	id: string;
	description: string;
	amount: number;
	category: TransactionCategory;
	type: TransactionType;
	createdAt: string;
};

export function formatTransactionLine(transaction: FormattableTransaction): string {
	const sign = transaction.type === "income" ? "+" : "-";
	return `${sign}${formatCurrencyCents(transaction.amount)} · ${getCategoryLabel(transaction.category)} · ${formatDate(transaction.createdAt)}\n${transaction.description}`;
}

export function formatTransactionList(transactions: FormattableTransaction[]): string {
	if (transactions.length === 0) {
		return "Nenhuma transação encontrada.";
	}

	return transactions.map((transaction, index) => `${index + 1}. ${formatTransactionLine(transaction)}`).join("\n\n");
}
