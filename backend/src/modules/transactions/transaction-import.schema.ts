import { z } from "zod";
import {
	MAX_AMOUNT_CENTS,
	MAX_DESCRIPTION_LENGTH,
	transactionCategories,
	transactionTypes,
} from "./transaction.schema";

// ~5 MB of CSV is tens of thousands of statement lines — generous for a
// personal bank export while capping how much a single request can parse.
export const MAX_CSV_LENGTH = 5_000_000;
export const MAX_IMPORT_ROWS = 5000;

export const importPreviewRequestSchema = z.object({
	csv: z.string().min(1, "Arquivo CSV vazio").max(MAX_CSV_LENGTH, "Arquivo CSV muito grande (máximo 5 MB)"),
});

export const importedTransactionSchema = z.object({
	description: z.string().trim().min(1).max(MAX_DESCRIPTION_LENGTH),
	amount: z.number().int("amount must be an integer number of cents").positive().max(MAX_AMOUNT_CENTS),
	category: z.enum(transactionCategories),
	type: z.enum(transactionTypes),
	createdAt: z.iso.datetime(),
});

export const importConfirmRequestSchema = z.object({
	transactions: z.array(importedTransactionSchema).min(1).max(MAX_IMPORT_ROWS),
});

export type ImportPreviewRequest = z.infer<typeof importPreviewRequestSchema>;
export type ImportedTransactionInput = z.infer<typeof importedTransactionSchema>;
export type ImportConfirmRequest = z.infer<typeof importConfirmRequestSchema>;
