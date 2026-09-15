import type { TransactionCategory } from "@elysia-galhardo-finances/api/src/modules/transactions/transaction.schema";
import { transactionCategories } from "@elysia-galhardo-finances/api/src/modules/transactions/transaction.schema";
import { transactionService } from "@elysia-galhardo-finances/api/src/modules/transactions/transaction.service";
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import {
	customRange,
	InvalidDateRangeError,
	last30Days,
	lastWeek,
	monthRange,
	yearRange,
} from "../date-ranges/date-ranges";
import { categoryLabels, formatTransactionList } from "../formatting/format";
import { chunk } from "../lib/chunk";
import { ensureUserReady } from "../lib/user-gate";
import { requirePassword } from "../lib/verify-password-step";
import type { BotConversation } from "../types";

const PER_PAGE = 20;

function filterMenuKeyboard(): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	const options: [string, string][] = [
		["Categoria", "filter:category"],
		["Nome da transação", "filter:name"],
		["Período (data inicial/final)", "filter:range"],
		["Ano", "filter:year"],
		["Mês", "filter:month"],
		["Última semana", "filter:lastweek"],
		["Últimos 30 dias", "filter:last30"],
	];
	for (const row of chunk(options, 2)) {
		for (const [label, data] of row) keyboard.text(label, data);
		keyboard.row();
	}
	return keyboard;
}

function categoryKeyboard(): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	for (const row of chunk(transactionCategories, 2)) {
		for (const category of row) keyboard.text(categoryLabels[category], `cat:${category}`);
		keyboard.row();
	}
	return keyboard;
}

async function runSearch(
	ctx: Context,
	conversation: BotConversation,
	userId: string,
	query: { search?: string; category?: TransactionCategory; from?: string; to?: string },
): Promise<void> {
	const result = await conversation.external(() =>
		transactionService.list(userId, { ...query, page: 1, perPage: PER_PAGE }),
	);

	const truncated = result.total > PER_PAGE;
	const header = truncated
		? `Encontradas ${result.total} transações, mostrando as ${PER_PAGE} mais recentes:`
		: `Encontradas ${result.total} transação(ões):`;

	await ctx.reply(`${header}\n\n${formatTransactionList(result.transactions)}`);
}

export async function searchConversation(conversation: BotConversation, ctx: Context): Promise<void> {
	const userId = await ensureUserReady(conversation, ctx);
	if (!userId) return;

	const passed = await requirePassword(conversation, ctx);
	if (!passed) return;

	await ctx.reply("🔎 Como você quer buscar?", { reply_markup: filterMenuKeyboard() });

	const choice = await conversation.waitFor("callback_query:data", {
		otherwise: (otherCtx) => otherCtx.reply("Use os botões acima para escolher como buscar."),
	});
	await choice.answerCallbackQuery();
	const kind = choice.callbackQuery.data.slice("filter:".length);

	if (kind === "lastweek") {
		const range = lastWeek();
		await runSearch(choice, conversation, userId, { from: range.from.toISOString(), to: range.to.toISOString() });
		return;
	}
	if (kind === "last30") {
		const range = last30Days();
		await runSearch(choice, conversation, userId, { from: range.from.toISOString(), to: range.to.toISOString() });
		return;
	}

	if (kind === "category") {
		await choice.reply("Escolha a categoria:", { reply_markup: categoryKeyboard() });
		const categoryChoice = await conversation.waitFor("callback_query:data", {
			otherwise: (otherCtx) => otherCtx.reply("Use os botões acima para escolher a categoria."),
		});
		await categoryChoice.answerCallbackQuery();
		const category = categoryChoice.callbackQuery.data.slice("cat:".length) as TransactionCategory;
		await runSearch(categoryChoice, conversation, userId, { category });
		return;
	}

	const prompts: Record<string, string> = {
		name: "Digite o nome (ou parte do nome) da transação:",
		range: "Digite a data inicial e final no formato dd/mm/aaaa dd/mm/aaaa (ex: 01/08/2026 15/08/2026):",
		year: "Digite o ano no formato aaaa (ex: 2026):",
		month: "Digite o mês no formato mm/aaaa (ex: 08/2026):",
	};

	const prompt = prompts[kind];
	if (!prompt) {
		await choice.reply("Opção inválida.");
		return;
	}
	await choice.reply(prompt);

	for (;;) {
		const reply = await conversation.waitFor("message:text", {
			otherwise: (otherCtx) => otherCtx.reply("Não entendi, envie em texto ou /cancelar para sair."),
		});
		const text = reply.message.text.trim();
		if (!text) {
			await reply.reply("Não entendi, tente novamente ou /cancelar para sair.");
			continue;
		}

		try {
			if (kind === "name") {
				await runSearch(reply, conversation, userId, { search: text });
			} else if (kind === "range") {
				const [fromText, toText] = text.split(/\s+/);
				if (!fromText || !toText) {
					throw new InvalidDateRangeError("Envie as duas datas separadas por espaço: dd/mm/aaaa dd/mm/aaaa");
				}
				const range = customRange(fromText, toText);
				await runSearch(reply, conversation, userId, {
					from: range.from.toISOString(),
					to: range.to.toISOString(),
				});
			} else if (kind === "year") {
				const range = yearRange(text);
				await runSearch(reply, conversation, userId, {
					from: range.from.toISOString(),
					to: range.to.toISOString(),
				});
			} else if (kind === "month") {
				const range = monthRange(text);
				await runSearch(reply, conversation, userId, {
					from: range.from.toISOString(),
					to: range.to.toISOString(),
				});
			}
		} catch (error) {
			if (error instanceof InvalidDateRangeError) {
				await reply.reply(`${error.message}. Tente novamente ou /cancelar para sair.`);
				continue;
			}
			throw error;
		}

		return;
	}
}
