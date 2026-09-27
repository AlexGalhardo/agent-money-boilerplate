// Same enum/labels as the backend and frontend
// (backend/src/modules/transactions/transaction.schema.ts,
// frontend/src/lib/categories.ts) — duplicated on purpose, see
// docs/code-conventions.md "sync points".
export const categoryLabels = {
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
} as const;

export type TransactionCategory = keyof typeof categoryLabels;

export const categoryOptions = Object.keys(categoryLabels) as TransactionCategory[];

export const incomeCategories: TransactionCategory[] = [
	"salary",
	"investment",
	"rental_income",
	"extra_income",
	"freelancer",
	"gifts",
	"prizes",
];

export const expenseCategories: TransactionCategory[] = categoryOptions.filter(
	(category) => !incomeCategories.includes(category),
);

export function getCategoryLabel(category: string): string {
	return category in categoryLabels ? categoryLabels[category as TransactionCategory] : category;
}

// The frontend's validated (CVD-safe) categorical palette, dark variant —
// the app is dark-only (see docs/design-system.md).
function buildColorMap(order: TransactionCategory[]): Record<string, string> {
	const slots = [
		"#3987e5",
		"#d95926",
		"#199e70",
		"#c98500",
		"#d55181",
		"#2e9b2e",
		"#9085e9",
		"#e66767",
		"#2dd4d2",
		"#c98047",
		"#e879f9",
	];
	const map: Record<string, string> = {};
	order.forEach((category, index) => {
		const color = slots[index];
		if (color) map[category] = color;
	});
	return map;
}

export const expenseCategoryColor = buildColorMap(expenseCategories);
export const incomeCategoryColor = buildColorMap(incomeCategories);

export function getCategoryColor(category: string, type: "income" | "expense"): string {
	const colors = type === "income" ? incomeCategoryColor : expenseCategoryColor;
	return colors[category] ?? "#71717a";
}
