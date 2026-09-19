import { z } from "zod";

export const txType = z.enum(["income", "expense"]);
export type TxType = z.infer<typeof txType>;

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

/** Sentinel used by the dashboard filter to mean "no category filter". */
export const ALL_CATEGORIES = "Todas";

export const ALL_CATEGORY_NAMES = Array.from(new Set<string>([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]));

export function categoriesForType(type: TxType): readonly string[] {
	return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export const categoriesResponse = z.object({
	income: z.array(z.string()),
	expense: z.array(z.string()),
});
export type CategoriesResponse = z.infer<typeof categoriesResponse>;
