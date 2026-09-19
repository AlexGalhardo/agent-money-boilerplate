// Mesmo enum/rótulos/cores do backend e do frontend (ver
// frontend/src/lib/categories.ts e backend/src/modules/transactions/transaction.schema.ts)
// — duplicado de propósito, mesmo padrão de categoryLabels no bot (ver
// CLAUDE.md), pra não depender do workspace do frontend (React/TanStack) só
// por causa de um mapa de strings.
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

// Mesma paleta categórica do frontend (ver buildColorMap em
// frontend/src/lib/categories.ts) — só a variante clara, os gráficos do
// mobile não seguem o tema escuro do sistema por ora.
function buildColorMap(order: TransactionCategory[]): Record<string, string> {
	const slots = [
		"#2a78d6",
		"#eb6834",
		"#1baf7a",
		"#eda100",
		"#e87ba4",
		"#008300",
		"#4a3aa7",
		"#e34948",
		"#0e9594",
		"#a1662f",
		"#c026d3",
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
	return colors[category] ?? "#525252";
}
