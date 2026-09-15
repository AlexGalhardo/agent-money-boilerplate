import { prisma } from "@elysia-galhardo-finances/api/src/config/prisma";

export class ChatAlreadyLinkedError extends Error {
	constructor() {
		super("Esse chat já está vinculado a outra conta");
		this.name = "ChatAlreadyLinkedError";
	}
}

/**
 * O bot é multi-tenant desde a Fase 9: cada chat do Telegram é vinculado a
 * uma conta do app via `User.telegramChatId` (numérico como string), campo
 * preenchível tanto em `/minha-conta` quanto pelo próprio bot (ver
 * `lib/link-account.ts`). Sem cache — cada update resolve de novo, custo
 * aceitável para o volume desta aplicação.
 */
export async function findUserIdByChatId(chatId: number): Promise<string | null> {
	const user = await prisma.user.findUnique({ where: { telegramChatId: String(chatId) } });
	return user?.id ?? null;
}

export async function findUserById(userId: string) {
	return prisma.user.findUnique({ where: { id: userId } });
}

/** Vincula o chat a uma conta existente. Falha se o chat já pertence a outra. */
export async function linkChatToUser(chatId: number, userId: string): Promise<void> {
	const existing = await prisma.user.findUnique({ where: { telegramChatId: String(chatId) } });
	if (existing && existing.id !== userId) {
		throw new ChatAlreadyLinkedError();
	}

	await prisma.user.update({ where: { id: userId }, data: { telegramChatId: String(chatId) } });
}

/** Desvincula o chat da conta atual, permitindo vincular outra em seguida. */
export async function unlinkChatFromUser(chatId: number): Promise<void> {
	const user = await prisma.user.findUnique({ where: { telegramChatId: String(chatId) } });
	if (!user) return;

	await prisma.user.update({ where: { id: user.id }, data: { telegramChatId: null } });
}
