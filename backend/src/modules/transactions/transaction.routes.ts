import { Elysia } from "elysia";
import { authPlugin } from "../../lib/auth.plugin";
import {
	createTransactionSchema,
	deleteResponseSchema,
	errorResponseSchema,
	listTransactionsQuerySchema,
	statisticsResponseSchema,
	transactionIdParamSchema,
	transactionListResponseSchema,
	transactionResponseSchema,
	updateTransactionSchema,
} from "./transaction.schema";
import { transactionService } from "./transaction.service";

// `detail` feeds the OpenAPI document rendered by Scalar on the frontend's
// /api page — it is user-facing documentation, hence Portuguese.
const unauthorized = { 401: errorResponseSchema };
const notFound = { 404: errorResponseSchema };

export const transactionRoutes = new Elysia({ prefix: "/transactions", tags: ["Transações"] })
	.use(authPlugin)
	.guard({ auth: true })
	.get(
		"/",
		async ({ user, query }) => ({ success: true as const, ...(await transactionService.list(user.id, query)) }),
		{
			query: listTransactionsQuerySchema,
			response: { 200: transactionListResponseSchema, ...unauthorized },
			detail: {
				summary: "Listar transações",
				description:
					"Lista paginada, da mais recente para a mais antiga. `search` filtra pela descrição (sem diferenciar acentos/maiúsculas); `from`/`to` são datas ISO 8601.",
			},
		},
	)
	.get(
		"/statistics",
		async ({ user }) => ({ success: true as const, stats: await transactionService.statsByCategory(user.id) }),
		{
			response: { 200: statisticsResponseSchema, ...unauthorized },
			detail: {
				summary: "Totais por categoria",
				description: "Soma e percentual de cada categoria, separados por tipo (receita/despesa).",
			},
		},
	)
	.get(
		"/:id",
		async ({ user, params }) => ({
			success: true as const,
			transaction: await transactionService.findById(user.id, params.id),
		}),
		{
			params: transactionIdParamSchema,
			response: { 200: transactionResponseSchema, ...unauthorized, ...notFound },
			detail: { summary: "Buscar transação" },
		},
	)
	.post(
		"/",
		async ({ user, body, status }) =>
			status(201, { success: true as const, transaction: await transactionService.create(user.id, body) }),
		{
			body: createTransactionSchema,
			response: { 201: transactionResponseSchema, ...unauthorized, 403: errorResponseSchema },
			detail: {
				summary: "Criar transação",
				description:
					"`amount` é um inteiro em centavos (R$ 49,90 = 4990). Responde 403 quando o plano gratuito atingiu o limite de transações.",
			},
		},
	)
	.put(
		"/:id",
		async ({ user, params, body }) => ({
			success: true as const,
			transaction: await transactionService.update(user.id, params.id, body),
		}),
		{
			params: transactionIdParamSchema,
			body: updateTransactionSchema,
			response: { 200: transactionResponseSchema, ...unauthorized, ...notFound },
			detail: { summary: "Atualizar transação", description: "Envie apenas os campos que quer alterar." },
		},
	)
	.delete(
		"/:id",
		async ({ user, params }) => {
			await transactionService.remove(user.id, params.id);
			return { success: true as const, message: "Transação apagada" };
		},
		{
			params: transactionIdParamSchema,
			response: { 200: deleteResponseSchema, ...unauthorized, ...notFound },
			detail: { summary: "Apagar transação" },
		},
	);
