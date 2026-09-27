import type { Context } from "grammy";
import type { BotConversation } from "../types";
import { ensureUserReady } from "./user-gate";
import { requirePassword } from "./verify-password-step";

export type AuthorizedConversation = (conversation: BotConversation, ctx: Context, userId: string) => Promise<void>;

/**
 * Every data-touching conversation starts the same way: make sure the chat is
 * linked to an account with an active plan, then (optionally) ask for the
 * personal password. This runs that preamble once and hands the resolved
 * `userId` to the conversation body; if either gate fails, the user has
 * already been told why and the body never runs.
 */
export function withAuthorizedUser(
	fn: AuthorizedConversation,
): (conversation: BotConversation, ctx: Context) => Promise<void> {
	return async (conversation, ctx) => {
		const userId = await ensureUserReady(conversation, ctx);
		if (!userId) return;

		if (!(await requirePassword(conversation, ctx))) return;

		await fn(conversation, ctx, userId);
	};
}
