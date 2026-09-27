import { transactionService } from "@agent-money-boilerplate/backend/src/modules/transactions/transaction.service";
import PDFDocument from "pdfkit";
import { formatCurrencyCents, getCategoryLabel } from "../formatting/format";

type CategoryTotal = { category: string; total: number };

const EXPENSE_COLOR = "#ef4444";
const INCOME_COLOR = "#10b981";

function aggregateByCategory(
	transactions: { type: "income" | "expense"; category: string; amount: number }[],
	type: "income" | "expense",
): CategoryTotal[] {
	const totals = new Map<string, number>();
	for (const transaction of transactions) {
		if (transaction.type !== type) continue;
		totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount);
	}
	return [...totals.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}

// No chart library: pdfkit is a vector drawing API, and horizontal bars
// (rectangles) are far simpler and sturdier to draw by hand than a pie chart
// (arc math) — same "total per category" information as the web dashboard.
function drawCategoryBarChart(doc: PDFKit.PDFDocument, title: string, rows: CategoryTotal[], color: string): void {
	doc.fontSize(13).fillColor("black").text(title);
	doc.moveDown(0.3);

	if (rows.length === 0) {
		doc.fontSize(10).fillColor("#666666").text("Nenhuma transação neste período.");
		doc.fillColor("black");
		doc.moveDown(0.6);
		return;
	}

	const chartWidth = 260;
	const barHeight = 14;
	const gap = 8;
	const startX = doc.x;
	const maxTotal = Math.max(...rows.map((row) => row.total));

	for (const row of rows) {
		const y = doc.y;
		const width = maxTotal > 0 ? Math.max(2, (row.total / maxTotal) * chartWidth) : 0;

		doc.rect(startX, y, width, barHeight).fill(color);
		doc.fillColor("black")
			.fontSize(9)
			.text(
				`${getCategoryLabel(row.category)} — ${formatCurrencyCents(row.total)}`,
				startX + chartWidth + 10,
				y + 2,
				{
					width: 200,
				},
			);

		doc.y = y + barHeight + gap;
	}

	doc.moveDown(0.4);
}

export async function buildPeriodReportPdf(
	userId: string,
	range: { from: Date; to: Date },
	title: string,
): Promise<Buffer> {
	const result = await transactionService.list(userId, {
		from: range.from.toISOString(),
		to: range.to.toISOString(),
		page: 1,
		perPage: Number.MAX_SAFE_INTEGER,
	});

	const expenseRows = aggregateByCategory(result.transactions, "expense");
	const incomeRows = aggregateByCategory(result.transactions, "income");
	const expenseTotal = expenseRows.reduce((sum, row) => sum + row.total, 0);
	const incomeTotal = incomeRows.reduce((sum, row) => sum + row.total, 0);

	const doc = new PDFDocument({ margin: 40, size: "A4" });
	const chunks: Buffer[] = [];
	doc.on("data", (chunk: Buffer) => chunks.push(chunk));
	const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

	doc.fontSize(18).text(title, { align: "center" });
	doc.moveDown();

	doc.fontSize(11);
	doc.text(`Receitas: ${formatCurrencyCents(incomeTotal)}`);
	doc.text(`Despesas: ${formatCurrencyCents(expenseTotal)}`);
	doc.text(`Saldo: ${formatCurrencyCents(incomeTotal - expenseTotal)}`);
	doc.text(`Transações no período: ${result.total}`);
	doc.moveDown();

	drawCategoryBarChart(doc, "Despesas por categoria", expenseRows, EXPENSE_COLOR);
	drawCategoryBarChart(doc, "Receitas por categoria", incomeRows, INCOME_COLOR);

	doc.end();
	return done;
}
