import { transactionService } from "@elysia-galhardo-finances/api/src/modules/transactions/transaction.service";
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { formatTransactionList } from "../formatting/format";
import { ensureUserReady } from "../lib/user-gate";
import { requirePassword } from "../lib/verify-password-step";
import type { BotConversation } from "../types";

const PER_PAGE = 10;

async function showPage(ctx: Context, conversation: BotConversation, userId: string, page: number): Promise<void> {
	const result = await conversation.external(() => transactionService.list(userId, { page, perPage: PER_PAGE }));

	const header = `Transações ${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, result.total)} de ${result.total}`;
	const body = formatTransactionList(result.transactions);
	const hasMore = page * PER_PAGE < result.total;

	await ctx.reply(
		`${header}\n\n${body}`,
		hasMore ? { reply_markup: new InlineKeyboard().text("➡️ Ver mais", `list:page:${page + 1}`) } : undefined,
	);
}

export async function listTransactionsConversation(conversation: BotConversation, ctx: Context): Promise<void> {
	const userId = await ensureUserReady(conversation, ctx);
	if (!userId) return;

	const passed = await requirePassword(conversation, ctx);
	if (!passed) return;

	let page = 1;
	await showPage(ctx, conversation, userId, page);

	for (;;) {
		const reply = await conversation.waitFor("callback_query:data", {
			otherwise: (otherCtx) => otherCtx.reply("Use o botão acima para ver mais, ou /cancelar para sair."),
		});
		const data = reply.callbackQuery.data;
		await reply.answerCallbackQuery();

		if (!data.startsWith("list:page:")) continue;
		page = Number(data.slice("list:page:".length));
		await showPage(reply, conversation, userId, page);
	}
}
