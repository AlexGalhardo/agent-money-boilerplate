import * as XLSX from "xlsx";
import type { TransactionCategory } from "./categories";
import { categoryLabels, formatCurrencyCents } from "./categories";

type ExportableTransaction = {
	description: string;
	amount: number;
	category: TransactionCategory;
	type: "income" | "expense";
	date: string;
};

function toRows(transactions: ExportableTransaction[]): Record<string, string>[] {
	return transactions.map((transaction) => ({
		Descrição: transaction.description,
		Categoria: categoryLabels[transaction.category] ?? transaction.category,
		Tipo: transaction.type === "income" ? "Receita" : "Despesa",
		Data: new Date(transaction.date).toLocaleDateString("pt-BR"),
		Valor: `${transaction.type === "income" ? "+" : "-"}${formatCurrencyCents(transaction.amount)}`,
	}));
}

function buildWorkbook(transactions: ExportableTransaction[]): XLSX.WorkBook {
	const worksheet = XLSX.utils.json_to_sheet(toRows(transactions));
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");
	return workbook;
}

export function exportTransactionsToXlsx(transactions: ExportableTransaction[]): void {
	XLSX.writeFile(buildWorkbook(transactions), "transacoes.xlsx");
}

export function exportTransactionsToCsv(transactions: ExportableTransaction[]): void {
	XLSX.writeFile(buildWorkbook(transactions), "transacoes.csv", { bookType: "csv" });
}
