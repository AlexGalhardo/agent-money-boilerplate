import { env as apiEnv } from "@agent-money-boilerplate/backend/src/config/env";
import { hasActivePlan } from "@agent-money-boilerplate/backend/src/lib/plan";
import { PLAN_DEFINITIONS, planIds } from "@agent-money-boilerplate/backend/src/modules/payments/payment.schema";
import {
	AbacatePayNotConfiguredError,
	paymentService,
} from "@agent-money-boilerplate/backend/src/modules/payments/payment.service";
import { findUserById } from "@agent-money-boilerplate/backend/src/modules/telegram/telegram.service";
import type { Context } from "grammy";
import { InlineKeyboard, InputFile } from "grammy";
import { formatDate } from "../formatting/format";
import type { BotConversation } from "../types";
import { ensureLinked } from "./auth-flows";

/**
 * Garante que o chat está vinculado a uma conta (pelo menu de login/criar
 * conta/Google/ID em `ensureLinked`, ver ./auth-flows.ts) e que essa conta
 * tem plano ativo (oferecendo o checkout PIX no próprio chat se não tiver).
 * Só retorna um userId quando as duas condições são satisfeitas — do
 * contrário, já respondeu ao usuário explicando o motivo e quem chamou deve
 * simplesmente parar (`return`).
 */
export async function ensureUserReady(conversation: BotConversation, ctx: Context): Promise<string | null> {
	const userId = await ensureLinked(conversation, ctx);
	if (!userId) return null;

	return ensureActivePlan(conversation, ctx, userId);
}

async function ensureActivePlan(conversation: BotConversation, ctx: Context, userId: string): Promise<string | null> {
	const user = await conversation.external(() => findUserById(userId));
	if (user && hasActivePlan(user)) return userId;

	await ctx.reply(
		"🔒 Sua conta está no plano gratuito, e o bot é exclusivo para quem tem um plano ativo. Escolha um plano para continuar:",
		{ reply_markup: planKeyboard() },
	);

	return runPaymentLoop(conversation, userId);
}

function planKeyboard(): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	for (const id of planIds) {
		const plan = PLAN_DEFINITIONS[id];
		keyboard.text(`${plan.label} — R$ ${(plan.amount / 100).toFixed(2)}`, `plan:${id}`).row();
	}
	keyboard.text("❌ Cancelar", "plan:cancel");
	return keyboard;
}

async function runPaymentLoop(conversation: BotConversation, userId: string): Promise<string | null> {
	for (;;) {
		const chosen = await conversation.waitFor("callback_query:data", {
			otherwise: (otherCtx) => otherCtx.reply("Use os botões acima."),
		});
		const data = chosen.callbackQuery.data;
		await chosen.answerCallbackQuery();

		if (data === "plan:cancel") {
			await chosen.reply("Operação cancelada.");
			return null;
		}

		if (!data.startsWith("plan:")) continue;
		const plan = data.slice("plan:".length) as (typeof planIds)[number];
		if (!planIds.includes(plan)) continue;

		const paid = await offerPixCheckout(conversation, chosen, userId, plan);
		if (paid) return userId;
		// usuário cancelou ou o PIX expirou — deixa escolher outro plano de novo
		await chosen.reply("Escolha um plano para continuar:", { reply_markup: planKeyboard() });
	}
}

type PixCheckoutResult =
	| { ok: true; charge: Awaited<ReturnType<typeof paymentService.createPixCheckout>> }
	| { ok: false };

// The exception must be caught IN HERE (not in a try/catch after the
// `await conversation.external(...)` call) because @grammyjs/conversations
// clones the returned/thrown value with `structuredClone` to write it to the
// replay log — and `structuredClone` on an Error instance drops its
// prototype chain, `.name` and any custom property (only `message`/`stack`
// survive). An `error instanceof AbacatePayNotConfiguredError` check done
// after `external()` never matches; the correct fix is to return a plain
// (serializable) value that survives the clone, same pattern as `callAuth`
// in bot/src/lib/auth-flows.ts.
async function tryCreatePixCheckout(userId: string, plan: (typeof planIds)[number]): Promise<PixCheckoutResult> {
	try {
		const charge = await paymentService.createPixCheckout(userId, plan);
		return { ok: true, charge };
	} catch (error) {
		if (error instanceof AbacatePayNotConfiguredError) return { ok: false };
		throw error;
	}
}

async function offerPixCheckout(
	conversation: BotConversation,
	ctx: Context,
	userId: string,
	plan: (typeof planIds)[number],
): Promise<boolean> {
	const result = await conversation.external(() => tryCreatePixCheckout(userId, plan));
	if (!result.ok) {
		await ctx.reply(`Pagamento pelo bot indisponível no momento — assine em ${apiEnv.FRONTEND_URL}/checkout.`);
		return false;
	}
	const charge = result.charge;

	const qrBuffer = await conversation.external(() => Buffer.from(charge.brCodeBase64, "base64"));
	await ctx.replyWithPhoto(new InputFile(qrBuffer, "pix.png"), {
		caption: "Escaneie o QR code acima ou copie o código PIX abaixo:",
	});
	await ctx.reply(`<code>${charge.brCode}</code>`, { parse_mode: "HTML" });

	const testMode = apiEnv.ABACATEPAY_PIX_TEST_MODE;
	const keyboard = new InlineKeyboard().text("🔄 Verificar pagamento", "pix:check").row();
	if (testMode) keyboard.text("🧪 Pagar PIX Teste Mode", "pix:simulate").row();
	keyboard.text("❌ Cancelar", "pix:cancel");

	await ctx.reply("Aguardando pagamento...", { reply_markup: keyboard });

	for (;;) {
		const action = await conversation.waitFor("callback_query:data", {
			otherwise: (otherCtx) => otherCtx.answerCallbackQuery(),
		});
		const data = action.callbackQuery.data;
		await action.answerCallbackQuery();

		if (data === "pix:cancel") {
			await action.reply("Operação cancelada.");
			return false;
		}

		if (data === "pix:simulate" && testMode) {
			await action.reply("Esse PIX será pago em 10 segundos...");
			// @grammyjs/conversations v2 não tem um `conversation.sleep()`
			// embutido — `external()` roda o timeout uma única vez na execução
			// real (nunca durante replay), que é o jeito replay-safe de
			// esperar um tempo fixo dentro de uma conversation.
			await conversation.external(() => new Promise<void>((resolve) => setTimeout(resolve, 10_000)));
			await conversation.external(() => paymentService.simulateCheckout(userId, charge.id));
		}

		if (data === "pix:check" || data === "pix:simulate") {
			const status = await conversation.external(() => paymentService.getCheckoutStatus(userId, charge.id));

			if (status.status === "paid") {
				const expiresAt = status.planExpiresAt ? formatDate(status.planExpiresAt) : "—";
				await action.reply(
					`✅ Pagamento realizado com sucesso! Você está no plano PRO até o dia ${expiresAt}.`,
				);
				return true;
			}

			if (status.status === "expired") {
				await action.reply("Esse PIX expirou. Escolha o plano novamente para gerar um novo código.");
				return false;
			}

			await action.reply("Ainda aguardando o pagamento...");
		}
	}
}
