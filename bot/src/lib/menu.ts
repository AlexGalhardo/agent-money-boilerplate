import { findUserIdByChatId } from "@agent-money-boilerplate/backend/src/modules/telegram/telegram.service";
import { userRepository } from "@agent-money-boilerplate/backend/src/modules/users/user.repository";
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import type { BotConversation } from "../types";
import { escapeMarkdown } from "./markdown";

export const HELP_TEXT = ["💬 *Money BOT*", "", "Use os botões abaixo para navegar."].join("\n");

export function mainMenuKeyboard(): InlineKeyboard {
	return new InlineKeyboard()
		.text("💸 Despesa", "menu:expense")
		.text("💰 Receita", "menu:income")
		.row()
		.text("📃 Transações", "menu:transactions")
		.text("📊 Resumo", "menu:summary")
		.row()
		.text("🔎 Buscar", "menu:search")
		.text("🗑️ Apagar", "menu:delete")
		.row()
		.text("📄 Relatório PDF", "menu:report")
		.row()
		.text("📂 Categorias", "menu:categories")
		.text("❓ Ajuda", "menu:help")
		.row()
		.text("🔌 Trocar de conta", "menu:switch-account");
}

// Shown instead of mainMenuKeyboard() whenever the chat isn't linked yet. The
// single button re-enters the "start" conversation (through the same "menu:"
// callback prefix bot.ts dispatches), which runs the access flow — nothing
// waits on this keyboard, so it must never offer any other button.
export function loginPromptKeyboard(): InlineKeyboard {
	return new InlineKeyboard().text("🔑 Entrar / Criar conta", "menu:login");
}

/**
 * Always shows which account is connected to this chat, when one is linked —
 * an explicit requirement to never leave the account in use ambiguous.
 */
function buildMenuMessage(user: { name: string; email: string } | null): string {
	if (!user) return HELP_TEXT;

	const accountBlock = [
		"",
		"👤 *Conta conectada*",
		`Nome: ${escapeMarkdown(user.name)}`,
		`E-mail: ${escapeMarkdown(user.email)}`,
	].join("\n");

	return `${HELP_TEXT}${accountBlock}`;
}

/**
 * The single source of truth for "what menu do we show this chat right
 * now" — every place that renders a menu after some operation (not in the
 * middle of a login/signup conversation) must go through this instead of
 * reaching for mainMenuKeyboard() directly, otherwise a signed-out chat gets
 * shown the full transaction menu (a bug fixed on 2026-09-20).
 */
export async function buildMenu(chatId: number | undefined): Promise<{ text: string; keyboard: InlineKeyboard }> {
	if (chatId === undefined) return { text: HELP_TEXT, keyboard: loginPromptKeyboard() };

	const userId = await findUserIdByChatId(chatId);
	const user = userId ? await userRepository.findById(userId) : null;

	return { text: buildMenuMessage(user), keyboard: user ? mainMenuKeyboard() : loginPromptKeyboard() };
}

/**
 * Wraps a conversation so that no matter how it ends — success,
 * cancellation, a thrown error, or an early `return` (account not linked,
 * password locked out) — the appropriate menu reappears afterwards: the
 * full transaction menu when the chat is linked to an account, or just the
 * "log in" button otherwise. Replaces the old pattern of asking for
 * /cancelar with a loop back to the menu, always.
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
				const { text, keyboard } = await conversation.external(() => buildMenu(chatId));
				await ctx.reply(text, { parse_mode: "Markdown", reply_markup: keyboard });
			}
		}
	};
}
