import { z } from "zod";

export const transactionCategories = [
	"food",
	"transport",
	"housing",
	"health",
	"education",
	"entertainment",
	"shopping",
	"salary",
	"investment",
	"transfers",
	"credit_card_bill",
	"insurance",
	"other",
] as const;

export const transactionTypes = ["income", "expense"] as const;

export const createTransactionSchema = z.object({
	description: z.string().trim().min(1).max(280),
	amount: z.number().int("amount deve ser um inteiro em centavos").positive(),
	category: z.enum(transactionCategories),
	type: z.enum(transactionTypes),
	date: z.iso.datetime().optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const listTransactionsQuerySchema = z.object({
	search: z.string().trim().min(1).optional(),
	category: z.enum(transactionCategories).optional(),
	from: z.iso.datetime().optional(),
	to: z.iso.datetime().optional(),
	page: z.coerce.number().int().min(1).default(1),
	perPage: z.coerce.number().int().min(1).max(1000).default(20),
});

export const transactionIdParamSchema = z.object({
	id: z.uuid(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type TransactionCategory = (typeof transactionCategories)[number];
export type TransactionType = (typeof transactionTypes)[number];

export type TransactionDTO = {
	id: string;
	description: string;
	amount: number;
	category: TransactionCategory;
	type: TransactionType;
	date: string;
	createdAt: string;
	updatedAt: string | null;
};
