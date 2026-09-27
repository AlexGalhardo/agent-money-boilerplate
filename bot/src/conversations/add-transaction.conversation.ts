import type {
	TransactionCategory,
	TransactionType,
} from "@agent-money-boilerplate/backend/src/modules/transactions/transaction.schema";
import { createTransactionSchema } from "@agent-money-boilerplate/backend/src/modules/transactions/transaction.schema";
import { transactionService } from "@agent-money-boilerplate/backend/src/modules/transactions/transaction.service";
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { categoryLabels, formatCurrencyCents } from "../formatting/format";
import { categoryKeyboard, parseCategoryCallback } from "../lib/keyboards";
import { parseAmountToCents } from "../lib/parse-amount";
import type { BotConversation } from "../types";

const descriptionSchema = createTransactionSchema.shape.description;
const amountSchema = createTransactionSchema.shape.amount;

export function createAddTransactionConversation(type: TransactionType, label: string) {
	return async function addTransactionConversation(
		conversation: BotConversation,
		ctx: Context,
		userId: string,
	): Promise<void> {
		await ctx.reply(`💰 Qual o valor da ${label}? (ex: 49.90)`);

		let amountCents: number | null = null;
		while (amountCents === null) {
			const reply = await conversation.waitFor("message:text", {
				otherwise: (otherCtx) => otherCtx.reply("Digite o valor em texto, ex: 49.90"),
			});
			const parsed = amountSchema.safeParse(parseAmountToCents(reply.message.text));
			if (parsed.success) {
				amountCents = parsed.data;
			} else {
				await reply.reply("Valor inválido. Digite um número maior que zero, ex: 49.90");
			}
		}

		await ctx.reply("📂 Escolha a categoria:", { reply_markup: categoryKeyboard() });

		let category: TransactionCategory | null = null;
		while (category === null) {
			const reply = await conversation.waitFor("callback_query:data", {
				otherwise: (otherCtx) => otherCtx.reply("Use os botões acima para escolher a categoria."),
			});
			await reply.answerCallbackQuery();
			category = parseCategoryCallback(reply.callbackQuery.data);
		}

		await ctx.reply("📝 Descreva a transação (ex: Supermercado, Uber, Salário...):");

		let description: string | null = null;
		while (description === null) {
			const reply = await conversation.waitFor("message:text", {
				otherwise: (otherCtx) => otherCtx.reply("Descreva a transação em texto:"),
			});
			const parsed = descriptionSchema.safeParse(reply.message.text);
			if (parsed.success) {
				description = parsed.data;
			} else {
				await reply.reply("A descrição precisa ter entre 1 e 280 caracteres. Descreva a transação:");
			}
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

		const input = { description, amount: amountCents, category, type };
		await conversation.external(() => transactionService.create(userId, input));

		await confirmation.reply(`✅ ${type === "expense" ? "Despesa" : "Receita"} registrada com sucesso!`);
	};
}
