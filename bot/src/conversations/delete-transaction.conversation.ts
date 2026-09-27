import { transactionService } from "@agent-money-boilerplate/backend/src/modules/transactions/transaction.service";
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { formatCurrencyCents, formatDate, getCategoryLabel } from "../formatting/format";
import type { BotConversation } from "../types";

type Candidate = { id: string; description: string; amount: number; category: string; createdAt: string };

function summarize(candidate: Candidate): string {
	return `${formatCurrencyCents(candidate.amount)} · ${getCategoryLabel(candidate.category)} · ${formatDate(candidate.createdAt)} — ${candidate.description}`;
}

export async function deleteTransactionConversation(
	conversation: BotConversation,
	ctx: Context,
	userId: string,
): Promise<void> {
	await ctx.reply("🗑️ Digite o nome (ou parte do nome) da transação que deseja apagar:");

	let candidates: Candidate[] = [];
	for (;;) {
		const reply = await conversation.waitFor("message:text", {
			otherwise: (otherCtx) => otherCtx.reply("Digite um texto para buscar:"),
		});
		const text = reply.message.text.trim();
		if (!text) {
			await reply.reply("Digite um texto para buscar:");
			continue;
		}

		const result = await conversation.external(() =>
			transactionService.list(userId, { search: text, page: 1, perPage: 10 }),
		);

		if (result.transactions.length === 0) {
			await reply.reply("Nenhuma transação encontrada com esse nome.");
			return;
		}

		candidates = result.transactions.map((transaction) => ({
			id: transaction.id,
			description: transaction.description,
			amount: transaction.amount,
			category: transaction.category,
			createdAt: transaction.createdAt,
		}));

		const keyboard = new InlineKeyboard();
		for (const candidate of candidates) {
			keyboard.text(summarize(candidate).slice(0, 64), `del:${candidate.id}`).row();
		}
		await reply.reply("Qual dessas você quer apagar?", { reply_markup: keyboard });
		break;
	}

	const picked = await conversation.waitFor("callback_query:data", {
		otherwise: (otherCtx) => otherCtx.reply("Use os botões acima para escolher a transação."),
	});
	const pickedId = picked.callbackQuery.data.slice("del:".length);
	const candidate = candidates.find((item) => item.id === pickedId);
	if (!candidate) {
		await picked.answerCallbackQuery("Transação não encontrada");
		return;
	}
	await picked.answerCallbackQuery();

	const confirmKeyboard = new InlineKeyboard()
		.text("✅ Sim, apagar", "confirm:yes")
		.text("❌ Cancelar", "confirm:no");
	await picked.reply(`Tem certeza que deseja apagar?\n\n${summarize(candidate)}`, { reply_markup: confirmKeyboard });

	const confirmation = await conversation.waitFor("callback_query:data", {
		otherwise: (otherCtx) => otherCtx.reply("Use os botões acima para confirmar ou cancelar."),
	});
	await confirmation.answerCallbackQuery();

	if (confirmation.callbackQuery.data !== "confirm:yes") {
		await confirmation.reply("Operação cancelada.");
		return;
	}

	await conversation.external(() => transactionService.remove(userId, candidate.id));
	await confirmation.reply("✅ Transação apagada com sucesso.");
}
