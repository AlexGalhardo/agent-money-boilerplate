import { z } from "zod";
import { transactionCategories, transactionTypes } from "./transaction.schema";

export const importPreviewRequestSchema = z.object({
	csv: z.string().min(1, "Arquivo CSV vazio"),
});

export const importedTransactionSchema = z.object({
	description: z.string().trim().min(1).max(280),
	amount: z.number().int("amount deve ser um inteiro em centavos").positive(),
	category: z.enum(transactionCategories),
	type: z.enum(transactionTypes),
	createdAt: z.iso.datetime(),
});

export const importConfirmRequestSchema = z.object({
	transactions: z.array(importedTransactionSchema).min(1).max(5000),
});

export type ImportPreviewRequest = z.infer<typeof importPreviewRequestSchema>;
export type ImportedTransactionInput = z.infer<typeof importedTransactionSchema>;
export type ImportConfirmRequest = z.infer<typeof importConfirmRequestSchema>;
