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
// ciclada dentro de um mesmo gráfico. Despesa e receita são gráficos
// separados, então reaproveitar slots entre eles não gera confusão.
function buildColorMap(order: TransactionCategory[]): Record<string, ThemedColor> {
	const lightSlots = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
	const darkSlots = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

	const map: Record<string, ThemedColor> = {};
	order.forEach((category, index) => {
		const light = lightSlots[index];
		const dark = darkSlots[index];
		if (light && dark) map[category] = { light, dark };
	});
	return map;
}

export const expenseCategoryColor = buildColorMap([
	"food",
	"transport",
	"housing",
	"health",
	"education",
	"entertainment",
	"shopping",
	"other",
]);

export const incomeCategoryColor = buildColorMap(incomeCategories);

export function formatCurrencyCents(cents: number): string {
	return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
