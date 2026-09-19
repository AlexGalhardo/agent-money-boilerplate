import type { Context } from "grammy";
import { env } from "../config/env";
import type { BotConversation } from "../types";
import { checkLockout, recordFailedAttempt, recordSuccessfulAttempt } from "./lockout";
import { verifyPassword } from "./password";

export type PasswordAttemptResult =
	| { outcome: "correct" }
	| { outcome: "incorrect" }
	| { outcome: "locked"; remainingMinutes: number };

/**
 * Lógica pura (sem I/O do Telegram) por trás da checagem de senha — separada
 * para poder ser testada diretamente, e para rodar dentro de
 * `conversation.external()` (mutação do Map de lockout precisa executar uma
 * única vez por tentativa real, não a cada replay da conversation).
 */
export function evaluatePasswordAttempt(chatId: number, text: string): PasswordAttemptResult {
	const lockStatus = checkLockout(chatId);
	if (lockStatus.locked) {
		return { outcome: "locked", remainingMinutes: Math.ceil(lockStatus.remainingMs / 60_000) };
	}

	if (!verifyPassword(text, env.BOT_PASSWORD_HASH)) {
		const status = recordFailedAttempt(chatId, env.BOT_MAX_ATTEMPTS, env.BOT_LOCKOUT_MINUTES);
		if (status.locked) {
			return { outcome: "locked", remainingMinutes: Math.ceil(status.remainingMs / 60_000) };
		}
		return { outcome: "incorrect" };
	}

	recordSuccessfulAttempt(chatId);
	return { outcome: "correct" };
}

/**
 * Pede a senha pessoal e só retorna `true` quando o usuário acerta. Apaga a
 * mensagem com a senha do chat por privacidade. Nunca lança — bloqueio ou
 * erro de digitação apenas encerram o fluxo (`false`), quem chama decide o
 * que fazer (normalmente, apenas retornar sem continuar a conversation).
 *
 * Todo esse fluxo é opcional: com TELEGRAM_BOT_USE_PASSWORD_TO_CONFIRM_ACTIONS=false
 * (padrão), nem pede a senha, só confirma direto.
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
