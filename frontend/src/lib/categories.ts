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

// Categorias de receita exibidas no card "Receitas por categoria", nos
// filtros e no modal de adicionar/editar transação quando o tipo é
// "income" — lista curada (não é só "o resto do enum"), por pedido do
// dono do produto.
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

type ThemedColor = { light: string; dark: string };

// Paleta categórica validada (CVD-safe) para gráficos — ordem fixa, nunca
// ciclada dentro de um mesmo gráfico.
function buildColorMap(order: TransactionCategory[]): Record<string, ThemedColor> {
	const lightSlots = [
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
	const darkSlots = [
		"#3987e5",
		"#d95926",
		"#199e70",
		"#c98500",
		"#d55181",
		"#008300",
		"#9085e9",
		"#e66767",
		"#2dd4d2",
		"#c98047",
		"#e879f9",
	];

	const map: Record<string, ThemedColor> = {};
	order.forEach((category, index) => {
		const light = lightSlots[index];
		const dark = darkSlots[index];
		if (light && dark) map[category] = { light, dark };
	});
	return map;
}

// Cada categoria exibida em um card recebe uma cor fixa e única dentro
// daquele card — despesa e receita são gráficos separados, então
// reaproveitar tons entre eles não gera confusão.
export const expenseCategoryColor = buildColorMap(expenseCategories);

export const incomeCategoryColor = buildColorMap(incomeCategories);

export function getCategoryColor(category: string, type: "income" | "expense", isDark: boolean): string {
	const colors = type === "income" ? incomeCategoryColor : expenseCategoryColor;
	const color = colors[category];
	if (!color) return isDark ? "#a3a3a3" : "#525252";
	return isDark ? color.dark : color.light;
}

export function formatCurrencyCents(cents: number): string {
	return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
