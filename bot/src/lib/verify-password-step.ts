import type { Context } from "grammy";
import { env } from "../config/env";
import type { BotConversation } from "../types";
import { createLockout, remainingMinutes } from "./lockout";
import { verifyPassword } from "./password";

export const passwordLockout = createLockout({
	maxAttempts: env.BOT_MAX_ATTEMPTS,
	lockoutMinutes: env.BOT_LOCKOUT_MINUTES,
});

export type PasswordAttemptResult =
	| { outcome: "correct" }
	| { outcome: "incorrect" }
	| { outcome: "locked"; remainingMinutes: number };

/**
 * Pure logic (no Telegram I/O) behind the password check — separate so it can
 * be tested directly, and so it runs inside `conversation.external()`: the
 * lockout state must change once per real attempt, not on every replay.
 */
export function evaluatePasswordAttempt(chatId: number, text: string): PasswordAttemptResult {
	const lockStatus = passwordLockout.check(chatId);
	if (lockStatus.locked) {
		return { outcome: "locked", remainingMinutes: remainingMinutes(lockStatus) };
	}

	if (!verifyPassword(text, env.BOT_PASSWORD_HASH)) {
		const status = passwordLockout.recordFailure(chatId);
		return status.locked
			? { outcome: "locked", remainingMinutes: remainingMinutes(status) }
			: { outcome: "incorrect" };
	}

	passwordLockout.recordSuccess(chatId);
	return { outcome: "correct" };
}

/**
 * Asks for the personal password and resolves `true` only once it matches.
 * Deletes the message holding the password. Never throws — lockout just ends
 * the flow with `false` and the caller stops.
 *
 * Opt-in: with TELEGRAM_BOT_USE_PASSWORD_TO_CONFIRM_ACTIONS=false (default)
 * no password is asked.
 */
export async function requirePassword(conversation: BotConversation, ctx: Context): Promise<boolean> {
	if (!env.TELEGRAM_BOT_USE_PASSWORD_TO_CONFIRM_ACTIONS) return true;

	const chatId = ctx.chat?.id;
	if (chatId === undefined) return false;

	await ctx.reply("🔒 Digite sua senha pessoal para continuar:");

	for (;;) {
		const replyCtx = await conversation.waitFor("message:text", {
			otherwise: (otherCtx) => otherCtx.reply("Digite sua senha em texto para continuar:"),
		});
		const text = replyCtx.message.text.trim();
		await replyCtx.deleteMessage().catch(() => undefined);

		const result = await conversation.external(() => evaluatePasswordAttempt(chatId, text));

		if (result.outcome === "locked") {
			await replyCtx.reply(
				`🚫 Bloqueado por tentativas incorretas. Tente novamente em ${result.remainingMinutes} min.`,
			);
			return false;
		}

		if (result.outcome === "incorrect") {
			await replyCtx.reply("❌ Senha incorreta. Digite novamente:");
			continue;
		}

		return true;
	}
}
