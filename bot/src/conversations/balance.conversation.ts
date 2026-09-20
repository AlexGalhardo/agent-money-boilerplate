import { transactionService } from "@agent-money-boilerplate/backend/src/modules/transactions/transaction.service";
import type { Context } from "grammy";
import { formatCurrencyCents, getCategoryLabel } from "../formatting/format";
import { ensureUserReady } from "../lib/user-gate";
import { requirePassword } from "../lib/verify-password-step";
import type { BotConversation } from "../types";

export async function balanceConversation(conversation: BotConversation, ctx: Context): Promise<void> {
	const userId = await ensureUserReady(conversation, ctx);
	if (!userId) return;

	const passed = await requirePassword(conversation, ctx);
	if (!passed) return;

	const stats = await conversation.external(() => transactionService.statsByCategory(userId));

	const incomeTotal = stats.filter((row) => row.type === "income").reduce((sum, row) => sum + row.total, 0);
	const expenseTotal = stats.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.total, 0);
	const balance = incomeTotal - expenseTotal;

	const lines = [
		"📊 Resumo geral",
		"",
		`Receitas: ${formatCurrencyCents(incomeTotal)}`,
		`Despesas: ${formatCurrencyCents(expenseTotal)}`,
		`Saldo: ${formatCurrencyCents(balance)}`,
		"",
		"Por categoria:",
		...stats
			.sort((a, b) => b.total - a.total)
			.map(
				(row) =>
					`${row.type === "income" ? "🟢" : "🔴"} ${getCategoryLabel(row.category)}: ${formatCurrencyCents(row.total)} (${row.percentage}%)`,
			),
	];

	await ctx.reply(lines.join("\n"));
}
