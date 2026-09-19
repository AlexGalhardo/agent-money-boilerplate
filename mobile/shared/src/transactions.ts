import { z } from "zod";

import { txType } from "./categories";
import { amountCents, dateOnly, isoTimestamp, makePage, uuid } from "./common";

export const transaction = z.object({
	id: uuid,
	type: txType,
	amountCents,
	category: z.string().min(1).max(60),
	description: z.string().max(200),
	date: dateOnly,
	createdAt: isoTimestamp,
	updatedAt: isoTimestamp,
});
export type Transaction = z.infer<typeof transaction>;

/**
 * Client-supplied fields for create/update. The client generates the `id`
 * (UUID) so a transaction created offline keeps its identity after sync.
 */
export const transactionInput = z.object({
	type: txType,
	amountCents,
	category: z.string().min(1).max(60),
	description: z.string().max(200).default(""),
	date: dateOnly,
});
export type TransactionInput = z.infer<typeof transactionInput>;

export const createTransactionRequest = transactionInput.extend({
	id: uuid.optional(),
});
export type CreateTransactionRequest = z.infer<typeof createTransactionRequest>;

export const transactionFiltersQuery = z.object({
	category: z.string().optional(),
	search: z.string().optional(),
	startDate: dateOnly.optional(),
	endDate: dateOnly.optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
export type TransactionFiltersQuery = z.infer<typeof transactionFiltersQuery>;

export const transactionPage = makePage(transaction);
export type TransactionPage = z.infer<typeof transactionPage>;

export const balance = z.object({
	income: z.number().int(),
	expense: z.number().int(),
	balance: z.number().int(),
});
export type Balance = z.infer<typeof balance>;

export const transactionListResponse = z.object({
	page: transactionPage,
	balance,
});
export type TransactionListResponse = z.infer<typeof transactionListResponse>;
