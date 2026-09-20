import { env as apiEnv } from "@agent-money-boilerplate/backend/src/config/env";
import { auth } from "@agent-money-boilerplate/backend/src/lib/auth";
import {
	ChatAlreadyLinkedError,
	createLinkToken,
	findUserById,
	findUserIdByChatId,
	linkChatToUser,
} from "@agent-money-boilerplate/backend/src/modules/telegram/telegram.service";
import { APIError } from "better-auth";
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { z } from "zod";
import type { BotConversation } from "../types";
import { translateAuthError } from "./auth-errors";
import { failingPasswordRules, PASSWORD_RULES } from "./password-rules";

function authMenuKeyboard(): InlineKeyboard {
	return new InlineKeyboard()
		.text("🔑 Entrar com e-mail e senha", "authmenu:login")
		.row()
		.text("🆕 Criar conta", "authmenu:signup")
		.row()
		.text("🌐 Entrar com Google", "authmenu:google")
		.row()
		.text("❓ Esqueci minha senha", "authmenu:forgot")
		.row()
		.text("🆔 Vincular por ID da conta", "authmenu:id");
}

function capitalizeFirstLetter(value: string): string {
	return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}

/** Pede um texto e repete até `validate` devolver `null` (válido). */
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

/** Como `promptText`, mas apaga cada mensagem digitada — a resposta é uma senha. */
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

/** Roda `fn` e devolve o `code` do better-auth em caso de erro, sem deixar o `APIError` vazar. */
async function callAuth<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; code?: string }> {
	try {
		return { ok: true, data: await fn() };
	} catch (error) {
		if (error instanceof APIError) {
			return { ok: false, code: typeof error.body?.code === "string" ? error.body.code : undefined };
		}
		throw error;
	}
}

const emailSchema = z.email();

async function handleIdLink(conversation: BotConversation, ctx: Context, chatId: number): Promise<string | null> {
	const candidateId = await promptText(
		conversation,
		ctx,
		"Envie o *ID da sua conta* — você encontra em *Minha Conta* no site, na seção “Bot do Telegram”.",
		() => null,
	);

	const user = await conversation.external(() => findUserById(candidateId));
	if (!user) {
		await ctx.reply("ID não encontrado. Confira em Minha Conta e toque em 'Vincular por ID da conta' de novo.");
		return null;
	}

	try {
		await conversation.external(() => linkChatToUser(chatId, candidateId));
	} catch (error) {
		if (error instanceof ChatAlreadyLinkedError) {
			await ctx.reply(
				"Esse chat já está vinculado a outra conta. Desvincule pelo site (apague o Chat ID em Minha Conta e salve) antes de vincular esta.",
			);
			return null;
		}
		throw error;
	}

	await ctx.reply(`✅ Conta vinculada! Olá, ${user.name}.`);
	return candidateId;
}

async function handleLogin(conversation: BotConversation, ctx: Context, chatId: number): Promise<string | null> {
	const email = await promptText(conversation, ctx, "Digite seu *e-mail*:", (text) =>
		emailSchema.safeParse(text).success ? null : "E-mail inválido.",
	);

	const password = await promptPassword(conversation, ctx, "🔒 Digite sua senha:", () => null);

	const result = await conversation.external(() =>
		callAuth(() => auth.api.signInEmail({ body: { email, password } })),
	);

	if (!result.ok) {
		if (result.code === "EMAIL_NOT_VERIFIED") {
			await ctx.reply("📧 Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada antes de entrar.");
			return null;
		}
		await ctx.reply(`❌ ${translateAuthError(result.code, "E-mail e/ou senha incorretos")}`);
		return null;
	}

	if ("twoFactorRedirect" in result.data && result.data.twoFactorRedirect) {
		await ctx.reply(
			"🔐 Sua conta tem verificação em duas etapas ativada. O bot ainda não suporta esse fluxo — entre pelo site, ou toque em 'Vincular por ID da conta'.",
		);
		return null;
	}

	await conversation.external(() => linkChatToUser(chatId, result.data.user.id));
	await ctx.reply(`✅ Conta vinculada! Olá, ${result.data.user.name}.`);
	return result.data.user.id;
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

	await conversation.external(() => linkChatToUser(chatId, result.data.user.id));
	await ctx.reply(`✅ Conta criada e vinculada! Bem-vindo(a), ${result.data.user.name}.`);
	return result.data.user.id;
}

async function handleForgotPassword(conversation: BotConversation, ctx: Context): Promise<null> {
	const email = await promptText(
		conversation,
		ctx,
		"Digite o *e-mail* da sua conta para receber o link de redefinição:",
		(text) => (emailSchema.safeParse(text).success ? null : "E-mail inválido."),
	);

	await conversation.external(() =>
		auth.api.requestPasswordReset({ body: { email, redirectTo: `${apiEnv.FRONTEND_URL}/resetar-senha` } }),
	);

	await ctx.reply(
		"📧 Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha. Abra o link no navegador, defina a nova senha e volte aqui para escolher 'Entrar com e-mail e senha'.",
	);
	return null;
}

async function handleGoogleLink(conversation: BotConversation, ctx: Context, chatId: number): Promise<string | null> {
	const { url } = await conversation.external(async () => {
		const { token } = await createLinkToken(chatId);
		return { url: `${apiEnv.FRONTEND_URL}/telegram-vincular?token=${encodeURIComponent(token)}` };
	});

	const keyboard = new InlineKeyboard()
		.url("🌐 Entrar com Google", url)
		.row()
		.text("🔄 Já entrei, verificar vínculo", "googlelink:check")
		.row()
		.text("❌ Cancelar", "googlelink:cancel");

	await ctx.reply(
		"Toque no botão abaixo para entrar com sua conta Google pelo navegador. Depois, volte aqui e toque em *Já entrei, verificar vínculo*.",
		{ parse_mode: "Markdown", reply_markup: keyboard },
	);

	for (;;) {
		const action = await conversation.waitFor("callback_query:data", {
			otherwise: (otherCtx) => otherCtx.reply("Use os botões acima."),
		});
		const data = action.callbackQuery.data;
		await action.answerCallbackQuery();

		if (data === "googlelink:cancel") {
			await action.reply("Operação cancelada.");
			return null;
		}

		if (data === "googlelink:check") {
			const linkedUserId = await conversation.external(() => findUserIdByChatId(chatId));
			if (!linkedUserId) {
				await action.reply(
					"Ainda não encontrei o vínculo. Conclua o login no navegador e toque em verificar de novo.",
				);
				continue;
			}
			const user = await conversation.external(() => findUserById(linkedUserId));
			await action.reply(`✅ Conta vinculada! Olá, ${user?.name ?? ""}.`);
			return linkedUserId;
		}
	}
}

/**
 * Mostra o menu de acesso (login, criar conta, Google, esqueci senha,
 * vincular por ID) até que uma das opções resulte numa conta vinculada ao
 * chat. Mesma lógica/validações do frontend (ver frontend/src/routes/entrar.tsx,
 * criar-conta.tsx, esqueci-senha.tsx) reaproveitando o better-auth direto —
 * o bot importa `auth` do workspace do backend, sem HTTP.
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
		const data = choice.callbackQuery.data;
		await choice.answerCallbackQuery();

		if (!data.startsWith("authmenu:")) continue;
		const option = data.slice("authmenu:".length);

		const userId =
			option === "login"
				? await handleLogin(conversation, choice, chatId)
				: option === "signup"
					? await handleSignup(conversation, choice, chatId)
					: option === "google"
						? await handleGoogleLink(conversation, choice, chatId)
						: option === "forgot"
							? await handleForgotPassword(conversation, choice)
							: option === "id"
								? await handleIdLink(conversation, choice, chatId)
								: null;

		if (userId) return userId;
	}
}
