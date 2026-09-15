import { transactionCategories } from "@elysia-galhardo-finances/api/src/modules/transactions/transaction.schema";
import { conversations, createConversation } from "@grammyjs/conversations";
import { Bot, InlineKeyboard } from "grammy";
import { env } from "./config/env";
import { createAddTransactionConversation } from "./conversations/add-transaction.conversation";
import { balanceConversation } from "./conversations/balance.conversation";
import { deleteTransactionConversation } from "./conversations/delete-transaction.conversation";
import { listTransactionsConversation } from "./conversations/list-transactions.conversation";
import { reportConversation } from "./conversations/report.conversation";
import { searchConversation } from "./conversations/search.conversation";
import { categoryLabels } from "./formatting/format";
import { findUserIdByChatId, unlinkChatFromUser } from "./lib/current-user";
import type { BotContext } from "./types";

const HELP_TEXT = [
	"💬 *Elysia Finanças — bot pessoal*",
	"",
	"Use os botões abaixo para navegar. Toda operação que acessa seus dados",
	"pede sua senha pessoal antes de continuar.",
	"",
	"Só um fluxo por vez: use /cancelar antes de iniciar outro.",
].join("\n");

function mainMenuKeyboard(): InlineKeyboard {
	return new InlineKeyboard()
		.text("💸 Despesa", "menu:despesa")
		.text("💰 Receita", "menu:receita")
		.row()
		.text("📃 Transações", "menu:transacoes")
		.text("📊 Resumo", "menu:resumo")
		.row()
		.text("🔎 Buscar", "menu:buscar")
		.text("🗑️ Apagar", "menu:apagar")
		.row()
		.text("📄 Relatório PDF", "menu:relatorio")
		.row()
		.text("📂 Categorias", "menu:categorias")
		.text("❓ Ajuda", "menu:ajuda")
		.row()
		.text("🔌 Trocar de conta", "menu:trocar-conta");
}

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

	bot.use(createConversation(createAddTransactionConversation("expense", "despesa"), "add-expense"));
	bot.use(createConversation(createAddTransactionConversation("income", "receita"), "add-income"));
	bot.use(createConversation(listTransactionsConversation, "list-transactions"));
	bot.use(createConversation(balanceConversation, "balance"));
	bot.use(createConversation(searchConversation, "search"));
	bot.use(createConversation(deleteTransactionConversation, "delete-transaction"));
	bot.use(createConversation(reportConversation, "report"));

	// Comando de escape — funciona mesmo com uma conversation em andamento,
	// já que sai de TODAS antes de qualquer outro middleware processar o update.
	bot.command("cancelar", async (ctx) => {
		await ctx.conversation.exitAll();
		await ctx.reply("Operação cancelada.");
	});

	bot.command("start", async (ctx) => {
		await ctx.reply(HELP_TEXT, { parse_mode: "Markdown", reply_markup: mainMenuKeyboard() });
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
			await ctx.reply(HELP_TEXT, { parse_mode: "Markdown", reply_markup: mainMenuKeyboard() });
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
		ctx.reply("⚠️ Ocorreu um erro inesperado. Tente novamente com /cancelar.").catch(() => undefined);
	});

	return bot;
}
