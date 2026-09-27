import type { Context } from "grammy";
import { ensureUserReady } from "../lib/user-gate";
import type { BotConversation } from "../types";

/**
 * /start doesn't show the menu directly — it first makes sure the chat is
 * linked to an account (running the same access flow as any other button)
 * with an active plan. The menu itself is always rendered afterwards by the
 * `withMainMenu` wrapper (lib/menu.ts), not here.
 */
export async function startConversation(conversation: BotConversation, ctx: Context): Promise<void> {
	await ensureUserReady(conversation, ctx);
}
