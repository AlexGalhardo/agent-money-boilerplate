import { Elysia } from "elysia";
import { authPlugin } from "../../lib/auth.plugin";
import { FreeLimitReachedError } from "../../lib/plan";
import {
	createTransactionSchema,
	listTransactionsQuerySchema,
	transactionIdParamSchema,
	updateTransactionSchema,
} from "./transaction.schema";
import { TransactionNotFoundError, transactionService } from "./transaction.service";

export const transactionRoutes = new Elysia({ prefix: "/transactions" })
	.use(authPlugin)
	.guard({ auth: true })
	.get(
		"/",
		async ({ user, query }) => {
			const result = await transactionService.list(user.id, query);
			return { success: true, ...result };
		},
		{ query: listTransactionsQuerySchema },
	)
	.get("/statistics", async ({ user }) => {
		const stats = await transactionService.statsByCategory(user.id);
		return { success: true, stats };
	})
	.get(
		"/:id",
		async ({ user, params, status }) => {
			try {
				const transaction = await transactionService.findById(user.id, params.id);
				return { success: true, transaction };
			} catch (error) {
				if (error instanceof TransactionNotFoundError) {
					return status(404, { success: false, message: error.message });
				}
				throw error;
			}
		},
		{ params: transactionIdParamSchema },
	)
	.post(
		"/",
		async ({ user, body, status }) => {
			try {
				const transaction = await transactionService.create(user.id, body);
				return status(201, { success: true, transaction });
			} catch (error) {
				if (error instanceof FreeLimitReachedError) {
					return status(403, { success: false, message: error.message });
				}
				throw error;
			}
		},
		{ body: createTransactionSchema },
	)
	.put(
		"/:id",
		async ({ user, params, body, status }) => {
			try {
				const transaction = await transactionService.update(user.id, params.id, body);
				return { success: true, transaction };
			} catch (error) {
				if (error instanceof TransactionNotFoundError) {
					return status(404, { success: false, message: error.message });
				}
				throw error;
			}
		},
		{ params: transactionIdParamSchema, body: updateTransactionSchema },
	)
	.delete(
		"/:id",
		async ({ user, params, status }) => {
			try {
				await transactionService.remove(user.id, params.id);
				return { success: true, message: "Transaction deleted successfully" };
			} catch (error) {
				if (error instanceof TransactionNotFoundError) {
					return status(404, { success: false, message: error.message });
				}
				throw error;
			}
		},
		{ params: transactionIdParamSchema },
	);
