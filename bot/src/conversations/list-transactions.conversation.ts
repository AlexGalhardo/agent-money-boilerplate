import { transactionService } from "@agent-money-boilerplate/backend/src/modules/transactions/transaction.service";
import type { Context } from "grammy";
import { formatTransactionList } from "../formatting/format";
import type { BotConversation } from "../types";

const MIN_LIMIT = 1;
const MAX_LIMIT = 10;

// Asking for the limit up front (instead of a "See more" pagination button)
// keeps the conversation from waiting on a callback that never comes once the
// last page has no button — the flow always ends with a `return`, and
// `withMainMenu` (lib/menu.ts) brings the menu back afterwards.
export async function listTransactionsConversation(
	conversation: BotConversation,
	ctx: Context,
	userId: string,
): Promise<void> {
	await ctx.reply(`📃 Quantas transações você quer ver? (${MIN_LIMIT} a ${MAX_LIMIT})`);

	let limit: number | null = null;
	while (limit === null) {
		const reply = await conversation.waitFor("message:text", {
			otherwise: (otherCtx) => otherCtx.reply(`Digite um número de ${MIN_LIMIT} a ${MAX_LIMIT}:`),
		});
		const parsed = Number(reply.message.text.trim());
		if (!Number.isInteger(parsed) || parsed < MIN_LIMIT || parsed > MAX_LIMIT) {
			await reply.reply(`Número inválido. Digite um valor de ${MIN_LIMIT} a ${MAX_LIMIT}:`);
			continue;
		}
		limit = parsed;
	}

	const result = await conversation.external(() => transactionService.list(userId, { page: 1, perPage: limit }));

	const header =
		result.total === 0
			? "Nenhuma transação encontrada."
			: `Mostrando ${Math.min(limit, result.total)} de ${result.total} transação(ões):`;
	const body = formatTransactionList(result.transactions);

	await ctx.reply(result.total === 0 ? header : `${header}\n\n${body}`);
}
