import { env as apiEnv } from "@agent-money-boilerplate/backend/src/config/env";
import { auth } from "@agent-money-boilerplate/backend/src/lib/auth";
import {
	createLinkToken,
	findUserIdByChatId,
	linkChatToUser,
} from "@agent-money-boilerplate/backend/src/modules/telegram/telegram.service";
import { userRepository } from "@agent-money-boilerplate/backend/src/modules/users/user.repository";
import { APIError } from "better-auth";
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { z } from "zod";
import type { BotConversation } from "../types";
import { translateAuthError } from "./auth-errors";
import { createLockout, remainingMinutes } from "./lockout";
import { failingPasswordRules, PASSWORD_RULES } from "./password-rules";

// The bot calls `auth.api.*` in-process, which bypasses better-auth's HTTP
// rate limiter — without this, a chat could brute-force passwords.
export const loginLockout = createLockout({ maxAttempts: 5, lockoutMinutes: 15 });

const emailSchema = z.email();

function authMenuKeyboard(): InlineKeyboard {
	return new InlineKeyboard()
		.text("🔑 Entrar com e-mail e senha", "authmenu:login")
		.row()
		.text("🆕 Criar conta", "authmenu:signup")
		.row()
		.text("🌐 Entrar pelo navegador (Google ou e-mail)", "authmenu:web")
		.row()
		.text("❓ Esqueci minha senha", "authmenu:forgot");
}

function capitalizeFirstLetter(value: string): string {
	return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}

/** Asks for text and repeats until `validate` returns `null` (valid). */
async function promptText(
	conversation: BotConversation,
	ctx: Context,
	promptMessage: string,
	validate: (text: string) => string | null,
): Promise<string> {
	await ctx.reply(promptMessage, { parse_mode: "Markdown" });

	for (;;) {
		const replyCtx = await conversation.waitFor("message:text", {
			otherwise: (otherCtx) => otherCtx.reply("Responda em texto:"),
		});
		const text = replyCtx.message.text.trim();
		const error = validate(text);
		if (error) {
			await replyCtx.reply(`${error} Tente novamente:`);
			continue;
		}
		return text;
	}
}

/** Like `promptText`, but deletes every typed message — the answer is a password. */
async function promptPassword(
	conversation: BotConversation,
	ctx: Context,
	promptMessage: string,
	validate: (text: string) => string | null,
): Promise<string> {
	await ctx.reply(promptMessage);

	for (;;) {
		const replyCtx = await conversation.waitFor("message:text", {
			otherwise: (otherCtx) => otherCtx.reply("Digite sua senha em texto:"),
		});
		const text = replyCtx.message.text.trim();
		await replyCtx.deleteMessage().catch(() => undefined);

		const error = validate(text);
		if (error) {
			await replyCtx.reply(`${error} Tente novamente:`);
			continue;
		}
		return text;
	}
}

type AuthResult<T> = { ok: true; data: T } | { ok: false; code?: string };

/**
 * Runs a better-auth call and returns a plain, serializable result. It must
 * not throw across `conversation.external()`: @grammyjs/conversations clones
 * results with `structuredClone`, which strips an Error's subclass, so an
 * `instanceof APIError` check after `external()` would never match.
 */
async function callAuth<T>(fn: () => Promise<T>): Promise<AuthResult<T>> {
	try {
		return { ok: true, data: await fn() };
	} catch (error) {
		if (error instanceof APIError) {
			return { ok: false, code: typeof error.body?.code === "string" ? error.body.code : undefined };
		}
		throw error;
	}
}

type LoginAttempt =
	| { outcome: "locked"; minutes: number }
	| { outcome: "failed"; code?: string }
	| { outcome: "two-factor" }
	| { outcome: "ok"; userId: string; name: string };

async function attemptLogin(chatId: number, email: string, password: string): Promise<LoginAttempt> {
	const lock = loginLockout.check(chatId);
	if (lock.locked) return { outcome: "locked", minutes: remainingMinutes(lock) };

	const result = await callAuth(() => auth.api.signInEmail({ body: { email, password } }));
	if (!result.ok) {
		const status = loginLockout.recordFailure(chatId);
		return status.locked
			? { outcome: "locked", minutes: remainingMinutes(status) }
			: { outcome: "failed", code: result.code };
	}

	loginLockout.recordSuccess(chatId);
	if ("twoFactorRedirect" in result.data && result.data.twoFactorRedirect) return { outcome: "two-factor" };
	if (!("user" in result.data)) return { outcome: "failed" };

	await linkChatToUser(chatId, result.data.user.id);
	return { outcome: "ok", userId: result.data.user.id, name: result.data.user.name };
}

async function handleLogin(conversation: BotConversation, ctx: Context, chatId: number): Promise<string | null> {
	const email = await promptText(conversation, ctx, "Digite seu *e-mail*:", (text) =>
		emailSchema.safeParse(text).success ? null : "E-mail inválido.",
	);
	const password = await promptPassword(conversation, ctx, "🔒 Digite sua senha:", () => null);

	const attempt = await conversation.external(() => attemptLogin(chatId, email, password));

	switch (attempt.outcome) {
		case "locked":
			await ctx.reply(`🚫 Muitas tentativas incorretas. Tente novamente em ${attempt.minutes} min.`);
			return null;
		case "failed":
			if (attempt.code === "EMAIL_NOT_VERIFIED") {
				await ctx.reply(
					"📧 Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada antes de entrar.",
				);
				return null;
			}
			await ctx.reply(`❌ ${translateAuthError(attempt.code, "E-mail e/ou senha incorretos")}`);
			return null;
		case "two-factor":
			await ctx.reply(
				"🔐 Sua conta tem verificação em duas etapas. Use a opção 'Entrar pelo navegador' para vincular este chat.",
			);
			return null;
		case "ok":
			await ctx.reply(`✅ Conta vinculada! Olá, ${attempt.name}.`);
			return attempt.userId;
	}
}

async function handleSignup(conversation: BotConversation, ctx: Context, chatId: number): Promise<string | null> {
	const rawName = await promptText(
		conversation,
		ctx,
		"Como podemos te chamar? Digite seu *nome* (4 a 16 letras):",
		(text) => {
			if (text.length < 4) return "Nome muito curto (mínimo 4 letras).";
			if (text.length > 16) return "Nome muito longo (máximo 16 caracteres).";
			return null;
		},
	);
	const name = capitalizeFirstLetter(rawName);

	const email = await promptText(conversation, ctx, "Digite seu *e-mail*:", (text) => {
		if (text.length > 48) return "E-mail muito longo (máximo 48 caracteres).";
		return emailSchema.safeParse(text).success ? null : "E-mail inválido.";
	});

	await ctx.reply(
		["Agora crie uma senha forte, com:", ...PASSWORD_RULES.map((rule) => `• ${rule.label}`)].join("\n"),
	);
	const password = await promptPassword(conversation, ctx, "Digite sua senha:", (text) => {
		const failing = failingPasswordRules(text);
		return failing.length === 0 ? null : `Ainda falta: ${failing.join(", ")}.`;
	});

	const result = await conversation.external(() =>
		callAuth(() => auth.api.signUpEmail({ body: { name, email, password } })),
	);

	if (!result.ok) {
		await ctx.reply(`❌ ${translateAuthError(result.code, "Não foi possível criar sua conta")}`);
		return null;
	}

	if (result.data.token === null) {
		await ctx.reply(
			"📧 Quase lá! Enviamos um link de confirmação para o seu e-mail. Confirme e depois volte aqui e escolha 'Entrar com e-mail e senha'.",
		);
		return null;
	}

	const userId = result.data.user.id;
	await conversation.external(() => linkChatToUser(chatId, userId));
	await ctx.reply(`✅ Conta criada e vinculada! Bem-vindo(a), ${result.data.user.name}.`);
	return userId;
}

async function handleForgotPassword(conversation: BotConversation, ctx: Context): Promise<null> {
	const email = await promptText(
		conversation,
		ctx,
		"Digite o *e-mail* da sua conta para receber o link de redefinição:",
		(text) => (emailSchema.safeParse(text).success ? null : "E-mail inválido."),
	);

	await conversation.external(() =>
		callAuth(() =>
			auth.api.requestPasswordReset({ body: { email, redirectTo: `${apiEnv.FRONTEND_URL}/resetar-senha` } }),
		),
	);

	await ctx.reply(
		"📧 Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha. Abra o link no navegador, defina a nova senha e volte aqui para escolher 'Entrar com e-mail e senha'.",
	);
	return null;
}

/** Links through the browser: works for Google and for accounts with 2FA. */
async function handleWebLink(conversation: BotConversation, ctx: Context, chatId: number): Promise<string | null> {
	const { url } = await conversation.external(async () => {
		const { token } = await createLinkToken(chatId);
		return { url: `${apiEnv.FRONTEND_URL}/telegram-vincular?token=${encodeURIComponent(token)}` };
	});

	const keyboard = new InlineKeyboard()
		.url("🌐 Abrir no navegador", url)
		.row()
		.text("🔄 Já entrei, verificar vínculo", "weblink:check")
		.row()
		.text("❌ Cancelar", "weblink:cancel");

	await ctx.reply(
		"Toque no botão abaixo para entrar pelo navegador (Google ou e-mail e senha). O link vale por 15 minutos. Depois, volte aqui e toque em *Já entrei, verificar vínculo*.",
		{ parse_mode: "Markdown", reply_markup: keyboard },
	);

	for (;;) {
		const action = await conversation.waitFor("callback_query:data", {
			otherwise: (otherCtx) => otherCtx.reply("Use os botões acima."),
		});
		const data = action.callbackQuery.data;
		await action.answerCallbackQuery();

		if (data === "weblink:cancel") {
			await action.reply("Operação cancelada.");
			return null;
		}

		if (data === "weblink:check") {
			const linked = await conversation.external(async () => {
				const userId = await findUserIdByChatId(chatId);
				const user = userId ? await userRepository.findById(userId) : null;
				return user ? { userId: user.id, name: user.name } : null;
			});
			if (!linked) {
				await action.reply(
					"Ainda não encontrei o vínculo. Conclua o login no navegador e toque em verificar de novo.",
				);
				continue;
			}
			await action.reply(`✅ Conta vinculada! Olá, ${linked.name}.`);
			return linked.userId;
		}
	}
}

const AUTH_MENU_HANDLERS: Record<
	string,
	(conversation: BotConversation, ctx: Context, chatId: number) => Promise<string | null>
> = {
	login: handleLogin,
	signup: handleSignup,
	web: handleWebLink,
	forgot: (conversation, ctx) => handleForgotPassword(conversation, ctx),
};

/**
 * Shows the access menu (login, sign up, browser login, forgot password)
 * until one option links an account to this chat. Every path proves control
 * of the account — never link from an identifier the user merely types.
 * Reuses better-auth in-process (the bot imports `auth` from the backend
 * workspace, no HTTP).
 */
export async function ensureLinked(conversation: BotConversation, ctx: Context): Promise<string | null> {
	const chatId = ctx.chat?.id;
	if (chatId === undefined) return null;

	const linkedUserId = await conversation.external(() => findUserIdByChatId(chatId));
	if (linkedUserId) return linkedUserId;

	for (;;) {
		await ctx.reply("👋 Para começar, escolha como você quer acessar sua conta:", {
			reply_markup: authMenuKeyboard(),
		});

		const choice = await conversation.waitFor("callback_query:data", {
			otherwise: (otherCtx) => otherCtx.reply("Toque em uma das opções acima."),
		});
		await choice.answerCallbackQuery();

		const handler = AUTH_MENU_HANDLERS[choice.callbackQuery.data.replace(/^authmenu:/, "")];
		const userId = handler ? await handler(conversation, choice, chatId) : null;

		if (userId) return userId;
	}
}
