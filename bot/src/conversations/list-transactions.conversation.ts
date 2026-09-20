import { transactionService } from "@agent-money-boilerplate/backend/src/modules/transactions/transaction.service";
import type { Context } from "grammy";
import { formatTransactionList } from "../formatting/format";
import { ensureUserReady } from "../lib/user-gate";
import { requirePassword } from "../lib/verify-password-step";
import type { BotConversation } from "../types";

const MIN_LIMIT = 1;
const MAX_LIMIT = 10;

// Pedir o limite antes de listar (em vez de sempre mostrar 10 com um botão
// "Ver mais" pra paginar) evita a conversation ficar esperando por uma
// callback_query que nunca chega quando a última página não tem mais botão
// nenhum — o fluxo sempre termina com um `return`, e é o `withMainMenu` (ver
// lib/menu.ts) quem garante que o menu principal reaparece em seguida.
export async function listTransactionsConversation(conversation: BotConversation, ctx: Context): Promise<void> {
	const userId = await ensureUserReady(conversation, ctx);
	if (!userId) return;

	const passed = await requirePassword(conversation, ctx);
	if (!passed) return;

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
