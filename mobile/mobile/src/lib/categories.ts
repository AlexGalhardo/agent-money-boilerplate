import type { TxType } from "./transactions";

export const INCOME_CATEGORIES = ["Salário", "Investimentos", "Aluguel recebido", "Vendas", "Outros"] as const;

export const EXPENSE_CATEGORIES = [
	"Alimentação",
	"Transporte",
	"Aluguel",
	"Saúde",
	"Educação",
	"Entretenimento",
	"Roupas",
	"Casa",
	"Mercado",
	"Serviços",
	"Outros",
] as const;

export function categoriesForType(type: TxType): readonly string[] {
	return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export const CATEGORIES = Array.from(new Set<string>([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]));

export type Category = string;

export const ALL_CATEGORIES = "Todas";
