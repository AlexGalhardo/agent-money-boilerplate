import type {
	TransactionCategory,
	TransactionType,
} from "@agent-money-boilerplate/backend/src/modules/transactions/transaction.schema";
import { transactionCategories } from "@agent-money-boilerplate/backend/src/modules/transactions/transaction.schema";
import { transactionService } from "@agent-money-boilerplate/backend/src/modules/transactions/transaction.service";
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { categoryLabels, formatCurrencyCents } from "../formatting/format";
import { chunk } from "../lib/chunk";
import { parseAmountToCents } from "../lib/parse-amount";
import { ensureUserReady } from "../lib/user-gate";
import { requirePassword } from "../lib/verify-password-step";
import type { BotConversation } from "../types";

function categoryKeyboard(): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	for (const row of chunk(transactionCategories, 2)) {
		for (const category of row) keyboard.text(categoryLabels[category], `cat:${category}`);
		keyboard.row();
	}
	return keyboard;
}

export function createAddTransactionConversation(type: TransactionType, label: string) {
	return async function addTransactionConversation(conversation: BotConversation, ctx: Context): Promise<void> {
		const userId = await ensureUserReady(conversation, ctx);
		if (!userId) return;

		const passed = await requirePassword(conversation, ctx);
		if (!passed) return;

		await ctx.reply(`💰 Qual o valor da ${label}? (ex: 49.90)`);

		let amountCents: number | null = null;
		while (amountCents === null) {
			const reply = await conversation.waitFor("message:text", {
				otherwise: (otherCtx) => otherCtx.reply("Digite o valor em texto, ex: 49.90"),
			});
			amountCents = parseAmountToCents(reply.message.text);
			if (amountCents === null) {
				await reply.reply("Valor inválido. Digite um número maior que zero, ex: 49.90");
			}
		}

		await ctx.reply("📂 Escolha a categoria:", { reply_markup: categoryKeyboard() });

		let category: TransactionCategory | null = null;
		while (category === null) {
			const reply = await conversation.waitFor("callback_query:data", {
				otherwise: (otherCtx) => otherCtx.reply("Use os botões acima para escolher a categoria."),
			});
			const data = reply.callbackQuery.data;
			await reply.answerCallbackQuery();
			if (data.startsWith("cat:") && transactionCategories.includes(data.slice(4) as TransactionCategory)) {
				category = data.slice(4) as TransactionCategory;
			}
		}

		await ctx.reply("📝 Descreva a transação (ex: Supermercado, Uber, Salário...):");

		let description: string | null = null;
		while (!description) {
			const reply = await conversation.waitFor("message:text", {
				otherwise: (otherCtx) => otherCtx.reply("Descreva a transação em texto:"),
			});
			const text = reply.message.text.trim();
			if (!text) {
				await reply.reply("Descrição não pode ser vazia. Descreva a transação:");
				continue;
			}
			description = text;
		}

		const summary = [
			`Confirma ${type === "expense" ? "a despesa" : "a receita"} abaixo?`,
			"",
			`Valor: ${formatCurrencyCents(amountCents)}`,
			`Categoria: ${categoryLabels[category]}`,
			`Descrição: ${description}`,
		].join("\n");

		const confirmKeyboard = new InlineKeyboard()
			.text("✅ Confirmar", "confirm:yes")
			.text("❌ Cancelar", "confirm:no");
		await ctx.reply(summary, { reply_markup: confirmKeyboard });

		const confirmation = await conversation.waitFor("callback_query:data", {
			otherwise: (otherCtx) => otherCtx.reply("Use os botões acima para confirmar ou cancelar."),
		});
		await confirmation.answerCallbackQuery();

		if (confirmation.callbackQuery.data !== "confirm:yes") {
			await confirmation.reply("Operação cancelada.");
			return;
		}

		await conversation.external(() =>
			transactionService.create(userId, { description, amount: amountCents as number, category, type }),
		);

		await confirmation.reply(`✅ ${type === "expense" ? "Despesa" : "Receita"} registrada com sucesso!`);
	};
}
