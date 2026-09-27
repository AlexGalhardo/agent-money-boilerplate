import { randomBytes } from "node:crypto";
import { prisma } from "../../config/prisma";
import { AppError } from "../../lib/errors";
import { userRepository } from "../users/user.repository";

// Long enough to finish a browser login (including Google OAuth) without
// leaving a usable token around for long.
const LINK_TOKEN_TTL_MS = 15 * 60 * 1000;

export class ChatAlreadyLinkedError extends AppError {
	constructor() {
		super("Esse chat já está vinculado a outra conta", 409);
	}
}

export class InvalidLinkTokenError extends AppError {
	constructor() {
		super("Link inválido ou expirado", 400);
	}
}

/**
 * The bot is multi-tenant: each Telegram chat is linked to one app account
 * through `User.telegramChatId`. Linking must always prove control of the
 * account — either the bot's e-mail/password login, or the single-use token
 * redeemed by an authenticated web session (`completeLinkToken`). Never link
 * from an identifier the requester merely claims to own.
 */
export async function findUserIdByChatId(chatId: number): Promise<string | null> {
	const user = await userRepository.findByTelegramChatId(String(chatId));
	return user?.id ?? null;
}

/** Links the chat to an account the caller has already authenticated as. */
export async function linkChatToUser(chatId: number, userId: string): Promise<void> {
	const existing = await userRepository.findByTelegramChatId(String(chatId));
	if (existing && existing.id !== userId) {
		throw new ChatAlreadyLinkedError();
	}

	await userRepository.update(userId, { telegramChatId: String(chatId) });
}

export async function unlinkChatFromUser(chatId: number): Promise<void> {
	const user = await userRepository.findByTelegramChatId(String(chatId));
	if (!user) return;

	await userRepository.update(user.id, { telegramChatId: null });
}

export async function unlinkUser(userId: string): Promise<void> {
	await userRepository.update(userId, { telegramChatId: null });
}

/**
 * Single-use token for linking a chat from the browser: the bot can't run
 * OAuth inside the chat, so it sends a link to a frontend page carrying this
 * token; once the user is logged in there (Google or e-mail/password),
 * `completeLinkToken` redeems it for the authenticated account.
 */
export async function createLinkToken(chatId: number): Promise<{ token: string; expiresAt: Date }> {
	const token = randomBytes(32).toString("base64url");
	const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS);

	await prisma.telegramLinkToken.create({ data: { token, chatId: String(chatId), expiresAt } });

	return { token, expiresAt };
}

/**
 * Deleting first (instead of find-then-delete) makes redemption atomic: two
 * concurrent requests with the same token can't both succeed, because only
 * one `delete` finds the row. Expired tokens are deleted too, so they don't
 * pile up.
 */
export async function completeLinkToken(userId: string, token: string): Promise<{ chatId: number }> {
	const record = await prisma.telegramLinkToken.delete({ where: { token } }).catch(() => null);

	if (!record || record.expiresAt < new Date()) {
		throw new InvalidLinkTokenError();
	}

	const chatId = Number(record.chatId);
	await linkChatToUser(chatId, userId);
	return { chatId };
}
