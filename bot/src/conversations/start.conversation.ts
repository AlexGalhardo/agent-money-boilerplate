import type { Context } from "grammy";
import { ensureUserReady } from "../lib/user-gate";
import type { BotConversation } from "../types";

/**
 * /start não mostra o menu diretamente — primeiro garante que o chat está
 * vinculado a uma conta (senão, dispara o mesmo fluxo de vinculação usado
 * por qualquer outro botão) e que a conta tem plano ativo. Quem mostra o
 * menu depois é sempre o wrapper `withMainMenu` (ver bot/src/lib/menu.ts),
 * não esta função.
 */
export async function startConversation(conversation: BotConversation, ctx: Context): Promise<void> {
	await ensureUserReady(conversation, ctx);
}
