import {
	findUserIdByChatId,
	unlinkChatFromUser,
} from "@elysia-galhardo-finances/backend/src/modules/telegram/telegram.service";
import { transactionCategories } from "@elysia-galhardo-finances/backend/src/modules/transactions/transaction.schema";
import { conversations, createConversation } from "@grammyjs/conversations";
import { Bot, InlineKeyboard } from "grammy";
import { env } from "./config/env";
import { createAddTransactionConversation } from "./conversations/add-transaction.conversation";
import { balanceConversation } from "./conversations/balance.conversation";
import { deleteTransactionConversation } from "./conversations/delete-transaction.conversation";
import { listTransactionsConversation } from "./conversations/list-transactions.conversation";
import { reportConversation } from "./conversations/report.conversation";
import { searchConversation } from "./conversations/search.conversation";
import { startConversation } from "./conversations/start.conversation";
import { categoryLabels } from "./formatting/format";
import { buildMenuMessage, HELP_TEXT, mainMenuKeyboard, withMainMenu } from "./lib/menu";
import type { BotContext } from "./types";

function confirmLogoutKeyboard(): InlineKeyboard {
	return new InlineKeyboard().text("✅ Sim, desconectar", "logout:confirm").text("❌ Cancelar", "logout:cancel");
}

const MENU_ACTIONS: Record<string, string> = {
	despesa: "add-expense",
	receita: "add-income",
	transacoes: "list-transactions",
	resumo: "balance",
	buscar: "search",
	apagar: "delete-transaction",
	relatorio: "report",
};

export function createBot(): Bot<BotContext> {
	const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);

	// @grammyjs/conversations v2 já vem com armazenamento próprio em memória
	// (por chat), sem precisar do `session()` clássico do grammY.
	bot.use(conversations());

	bot.use(createConversation(withMainMenu(startConversation), "start"));
	bot.use(createConversation(withMainMenu(createAddTransactionConversation("expense", "despesa")), "add-expense"));
	bot.use(createConversation(withMainMenu(createAddTransactionConversation("income", "receita")), "add-income"));
	bot.use(createConversation(withMainMenu(listTransactionsConversation), "list-transactions"));
	bot.use(createConversation(withMainMenu(balanceConversation), "balance"));
	bot.use(createConversation(withMainMenu(searchConversation), "search"));
	bot.use(createConversation(withMainMenu(deleteTransactionConversation), "delete-transaction"));
	bot.use(createConversation(withMainMenu(reportConversation), "report"));

	// Comando de escape — funciona mesmo com uma conversation em andamento,
	// já que sai de TODAS antes de qualquer outro middleware processar o update.
	bot.command("cancelar", async (ctx) => {
		await ctx.conversation.exitAll();
		const chatId = ctx.chat?.id;
		const text = chatId === undefined ? HELP_TEXT : await buildMenuMessage(chatId);
		await ctx.reply(text, { parse_mode: "Markdown", reply_markup: mainMenuKeyboard() });
	});

	bot.command("start", async (ctx) => {
		await ctx.conversation.enter("start");
	});

	bot.callbackQuery(/^menu:/, async (ctx) => {
		await ctx.answerCallbackQuery();
		const action = ctx.callbackQuery.data.slice("menu:".length);

		if (action === "categorias") {
			const list = transactionCategories.map((category) => `• ${categoryLabels[category]}`).join("\n");
			await ctx.reply(`Categorias disponíveis:\n\n${list}`);
			return;
		}

		if (action === "ajuda") {
			const chatId = ctx.chat?.id;
			const text = chatId === undefined ? HELP_TEXT : await buildMenuMessage(chatId);
			await ctx.reply(text, { parse_mode: "Markdown", reply_markup: mainMenuKeyboard() });
			return;
		}

		if (action === "trocar-conta") {
			const chatId = ctx.chat?.id;
			const linkedUserId = chatId === undefined ? null : await findUserIdByChatId(chatId);
			if (!linkedUserId) {
				await ctx.reply("Este chat ainda não está vinculado a nenhuma conta.");
				return;
			}
			await ctx.reply(
				"Tem certeza que deseja desconectar a conta atual deste chat? Você poderá vincular outra em seguida.",
				{ reply_markup: confirmLogoutKeyboard() },
			);
			return;
		}

		const conversationId = MENU_ACTIONS[action];
		if (conversationId) {
			await ctx.conversation.enter(conversationId);
		}
	});

	bot.callbackQuery(/^logout:/, async (ctx) => {
		await ctx.answerCallbackQuery();
		const action = ctx.callbackQuery.data.slice("logout:".length);
		const chatId = ctx.chat?.id;

		if (action === "confirm" && chatId !== undefined) {
			await unlinkChatFromUser(chatId);
			await ctx.reply(
				"🔌 Conta desconectada. Envie o *ID da conta* que deseja vincular na próxima vez que usar qualquer opção do menu.",
				{ parse_mode: "Markdown" },
			);
			return;
		}

		await ctx.reply("Operação cancelada.");
	});

	// Fallback global: qualquer update que não seja um comando conhecido nem
	// esteja sendo consumido por uma conversation em andamento cai aqui —
	// evita o bot ficar em silêncio (e o usuário achando que travou).
	bot.on("message", async (ctx) => {
		await ctx.reply("Não entendi. Use os botões abaixo:", { reply_markup: mainMenuKeyboard() });
	});

	bot.catch(({ error, ctx }) => {
		console.error(`Erro não tratado para update ${ctx.update.update_id}:`, error);
		ctx.reply("⚠️ Ocorreu um erro inesperado. Toque em um botão abaixo para continuar:", {
			reply_markup: mainMenuKeyboard(),
		}).catch(() => undefined);
	});

	return bot;
}
