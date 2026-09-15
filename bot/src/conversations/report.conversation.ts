import type { Context } from "grammy";
import { InlineKeyboard, InputFile } from "grammy";
import { last30Days, lastWeek } from "../date-ranges/date-ranges";
import { buildPeriodReportPdf } from "../lib/pdf-report";
import { ensureUserReady } from "../lib/user-gate";
import { requirePassword } from "../lib/verify-password-step";
import type { BotConversation } from "../types";

export async function reportConversation(conversation: BotConversation, ctx: Context): Promise<void> {
	const userId = await ensureUserReady(conversation, ctx);
	if (!userId) return;

	const passed = await requirePassword(conversation, ctx);
	if (!passed) return;

	const keyboard = new InlineKeyboard()
		.text("Últimos 7 dias", "report:7")
		.text("Últimos 30 dias", "report:30")
		.row()
		.text("❌ Cancelar", "report:cancel");
	await ctx.reply("📄 Gerar relatório em PDF de qual período?", { reply_markup: keyboard });

	const choice = await conversation.waitFor("callback_query:data", {
		otherwise: (otherCtx) => otherCtx.reply("Use os botões acima."),
	});
	await choice.answerCallbackQuery();

	if (choice.callbackQuery.data === "report:cancel") {
		await choice.reply("Operação cancelada.");
		return;
	}

	const days = choice.callbackQuery.data === "report:7" ? 7 : 30;
	const range = days === 7 ? lastWeek() : last30Days();

	await choice.reply("Gerando o PDF, um instante...");

	const pdfBuffer = await conversation.external(() =>
		buildPeriodReportPdf(userId, range, `Relatório — últimos ${days} dias`),
	);

	await choice.replyWithDocument(new InputFile(pdfBuffer, `relatorio-${days}-dias.pdf`));
}
