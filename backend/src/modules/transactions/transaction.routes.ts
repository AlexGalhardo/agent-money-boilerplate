import { Elysia } from "elysia";
import { authPlugin } from "../../lib/auth.plugin";
import {
	createTransactionSchema,
	listTransactionsQuerySchema,
	transactionIdParamSchema,
	updateTransactionSchema,
} from "./transaction.schema";
import { transactionService } from "./transaction.service";

export const transactionRoutes = new Elysia({ prefix: "/transactions" })
	.use(authPlugin)
	.guard({ auth: true })
	.get("/", async ({ user, query }) => ({ success: true, ...(await transactionService.list(user.id, query)) }), {
		query: listTransactionsQuerySchema,
	})
	.get("/statistics", async ({ user }) => ({
		success: true,
		stats: await transactionService.statsByCategory(user.id),
	}))
	.get(
		"/:id",
		async ({ user, params }) => ({
			success: true,
			transaction: await transactionService.findById(user.id, params.id),
		}),
		{ params: transactionIdParamSchema },
	)
	.post(
		"/",
		async ({ user, body, status }) =>
			status(201, { success: true, transaction: await transactionService.create(user.id, body) }),
		{ body: createTransactionSchema },
	)
	.put(
		"/:id",
		async ({ user, params, body }) => ({
			success: true,
			transaction: await transactionService.update(user.id, params.id, body),
		}),
		{ params: transactionIdParamSchema, body: updateTransactionSchema },
	)
	.delete(
		"/:id",
		async ({ user, params }) => {
			await transactionService.remove(user.id, params.id);
			return { success: true, message: "Transação apagada" };
		},
		{ params: transactionIdParamSchema },
	);
