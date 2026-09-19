import {
	findUserById,
	findUserIdByChatId,
} from "@elysia-galhardo-finances/backend/src/modules/telegram/telegram.service";
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import type { BotConversation } from "../types";

export const HELP_TEXT = [
	"💬 *Money BOT*",
	"",
	"Use os botões abaixo para navegar. Toda operação que acessa seus dados",
	"pede sua senha pessoal antes de continuar.",
].join("\n");

export function mainMenuKeyboard(): InlineKeyboard {
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

/**
 * Sempre mostra qual conta está conectada a este chat (nome, chat ID e ID
 * usado como "conta" em Minha Conta no site), quando houver uma vinculada —
 * pedido explícito para nunca deixar ambíguo qual conta está em uso.
 */
export async function buildMenuMessage(chatId: number): Promise<string> {
	const userId = await findUserIdByChatId(chatId);
	const user = userId ? await findUserById(userId) : null;

	if (!user) return HELP_TEXT;

	const accountBlock = [
		"",
		"👤 *Conta conectada*",
		`Nome: ${user.name}`,
		`Chat ID: ${chatId}`,
		`ID da conta (dashboard): \`${user.id}\``,
	].join("\n");

	return `${HELP_TEXT}${accountBlock}`;
}

/**
 * Envolve uma conversation para que, não importa como ela termine —
 * sucesso, cancelamento, erro lançado, ou um `return` antecipado (conta não
 * vinculada, senha bloqueada) — o menu principal reapareça em seguida. Troca
 * o antigo padrão de pedir /cancelar por um loop de volta ao menu, sempre.
 */
export function withMainMenu(
	fn: (conversation: BotConversation, ctx: Context) => Promise<void>,
): (conversation: BotConversation, ctx: Context) => Promise<void> {
	return async function wrapped(conversation: BotConversation, ctx: Context): Promise<void> {
		try {
			await fn(conversation, ctx);
		} finally {
			const chatId = ctx.chat?.id;
			if (chatId !== undefined) {
				const text = await conversation.external(() => buildMenuMessage(chatId));
				await ctx.reply(text, { parse_mode: "Markdown", reply_markup: mainMenuKeyboard() });
			}
		}
	};
}
