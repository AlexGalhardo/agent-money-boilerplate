import { randomBytes } from "node:crypto";
import { prisma } from "../../config/prisma";

// 15 minutos é tempo suficiente pra completar um login (inclusive com OAuth
// do Google) no navegador sem deixar o token vulnerável por muito tempo.
const LINK_TOKEN_TTL_MS = 15 * 60 * 1000;

export class ChatAlreadyLinkedError extends Error {
	constructor() {
		super("Esse chat já está vinculado a outra conta");
		this.name = "ChatAlreadyLinkedError";
	}
}

export class InvalidLinkTokenError extends Error {
	constructor() {
		super("Link inválido ou expirado");
		this.name = "InvalidLinkTokenError";
	}
}

/**
 * O bot é multi-tenant desde a Fase 9: cada chat do Telegram é vinculado a
 * uma conta do app via `User.telegramChatId` (numérico como string), campo
 * preenchível tanto em `/minha-conta` quanto pelo próprio bot. Vive no
 * backend (não no bot) porque tanto o bot quanto o fluxo de login com Google
 * do bot (que termina numa página do frontend, ver telegram.routes.ts)
 * precisam ler/escrever esse vínculo.
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

/**
 * Gera um token de uso único pro fluxo de "entrar com Google" do bot: o bot
 * não consegue abrir um navegador dentro do chat, então manda um link com
 * esse token pra uma página do frontend — quando o usuário completa o login
 * lá (Google ou e-mail/senha), `completeLink` consome o token e vincula o
 * chat à conta autenticada.
 */
export async function createLinkToken(chatId: number): Promise<{ token: string; expiresAt: Date }> {
	const token = randomBytes(32).toString("base64url");
	const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS);

	await prisma.telegramLinkToken.create({ data: { token, chatId: String(chatId), expiresAt } });

	return { token, expiresAt };
}

/**
 * Resgata um token de link (chamado pela página do frontend, já autenticada)
 * e vincula o chat correspondente à conta logada. Sempre apaga o token,
 * mesmo se expirado, pra não deixar lixo acumulando na tabela.
 */
export async function completeLinkToken(userId: string, token: string): Promise<{ chatId: number }> {
	const record = await prisma.telegramLinkToken.findUnique({ where: { token } });
	if (record) {
		await prisma.telegramLinkToken.delete({ where: { token } });
	}

	if (!record || record.expiresAt < new Date()) {
		throw new InvalidLinkTokenError();
	}

	const chatId = Number(record.chatId);
	await linkChatToUser(chatId, userId);
	return { chatId };
}
