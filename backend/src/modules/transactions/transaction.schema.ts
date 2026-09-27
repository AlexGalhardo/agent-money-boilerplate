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
	"rental_income",
	"extra_income",
	"freelancer",
	"gifts",
	"prizes",
	"transfers",
	"credit_card_bill",
	"insurance",
	"other",
] as const;

export const transactionTypes = ["income", "expense"] as const;

// R$ 1 billion — far above any personal transaction, low enough that sums
// of thousands of rows stay well inside Number.MAX_SAFE_INTEGER.
export const MAX_AMOUNT_CENTS = 100_000_000_000;
export const MAX_DESCRIPTION_LENGTH = 280;

export const createTransactionSchema = z.object({
	description: z.string().trim().min(1).max(MAX_DESCRIPTION_LENGTH),
	amount: z.number().int("amount must be an integer number of cents").positive().max(MAX_AMOUNT_CENTS),
	category: z.enum(transactionCategories),
	type: z.enum(transactionTypes),
	date: z.iso.datetime().optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const listTransactionsQuerySchema = z.object({
	search: z.string().trim().min(1).max(MAX_DESCRIPTION_LENGTH).optional(),
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

export const transactionDTOSchema = z.object({
	id: z.uuid(),
	description: z.string().meta({ examples: ["SUPERMERCADO"] }),
	amount: z
		.number()
		.int()
		.nonnegative()
		.describe("Integer number of cents")
		.meta({ examples: [4990] }),
	category: z.enum(transactionCategories),
	type: z.enum(transactionTypes),
	date: z
		.string()
		.describe("ISO 8601")
		.meta({ examples: ["2026-09-27T12:00:00.000Z"] }),
	createdAt: z
		.string()
		.describe("ISO 8601")
		.meta({ examples: ["2026-09-27T12:00:00.000Z"] }),
	updatedAt: z.string().nullable().describe("ISO 8601"),
});

export type TransactionDTO = z.infer<typeof transactionDTOSchema>;

/** Body of every expected failure (see AppError and the error mapper in app.ts). */
export const errorResponseSchema = z.object({ success: z.literal(false), message: z.string() });

export const transactionResponseSchema = z.object({ success: z.literal(true), transaction: transactionDTOSchema });

export const transactionListResponseSchema = z.object({
	success: z.literal(true),
	transactions: z.array(transactionDTOSchema),
	total: z.number().int(),
	page: z.number().int(),
	perPage: z.number().int(),
});

export const statisticsResponseSchema = z.object({
	success: z.literal(true),
	stats: z.array(
		z.object({
			category: z.string(),
			type: z.enum(transactionTypes),
			total: z.number().int(),
			percentage: z.number(),
		}),
	),
});

export const deleteResponseSchema = z.object({ success: z.literal(true), message: z.string() });
