import {
	findUserById,
	findUserIdByChatId,
} from "@agent-money-boilerplate/backend/src/modules/telegram/telegram.service";
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

// Shown instead of mainMenuKeyboard() whenever the chat isn't linked to an
// account yet. The single button re-enters the "start" conversation (via the
// same "menu:" callback prefix bot.ts already dispatches through
// ctx.conversation.enter), which is what actually runs the login/signup/
// Google/link-by-ID flow — this keyboard itself has no conversation waiting
// on it, so it must never offer any button beyond this one.
export function loginPromptKeyboard(): InlineKeyboard {
	return new InlineKeyboard().text("🔑 Entrar / Criar conta", "menu:entrar");
}

/**
 * Always shows which account is connected to this chat (name, chat ID and
 * the ID used as "account" in Minha Conta on the site), when one is linked —
 * an explicit requirement to never leave which account is in use ambiguous.
 */
async function buildMenuMessage(chatId: number, user: { name: string; id: string } | null): Promise<string> {
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
 * The single source of truth for "what menu do we show this chat right
 * now" — every place that renders a menu after some operation (not in the
 * middle of a login/signup conversation) must go through this instead of
 * reaching for mainMenuKeyboard() directly, otherwise a signed-out chat gets
 * shown the full transaction menu (it used to, see docs/security-incidents.md
 * equivalent bug report from 2026-09-20).
 */
export async function buildMenu(chatId: number | undefined): Promise<{ text: string; keyboard: InlineKeyboard }> {
	if (chatId === undefined) return { text: HELP_TEXT, keyboard: loginPromptKeyboard() };

	const userId = await findUserIdByChatId(chatId);
	const user = userId ? await findUserById(userId) : null;

	const text = await buildMenuMessage(chatId, user);
	return { text, keyboard: user ? mainMenuKeyboard() : loginPromptKeyboard() };
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
