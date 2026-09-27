import writeExcelFile from "write-excel-file/browser";
import type { TransactionCategory } from "./categories";
import { categoryLabels, formatCurrencyCents } from "./categories";

type ExportableTransaction = {
	description: string;
	amount: number;
	category: TransactionCategory;
	type: "income" | "expense";
	date: string;
};

const HEADERS = ["Descrição", "Categoria", "Tipo", "Data", "Valor"];

// Spreadsheet apps execute cells starting with these characters as formulas
// (CSV/formula injection, OWASP A03) — descriptions are user-controlled.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function neutralizeFormula(value: string): string {
	return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

function toRow(transaction: ExportableTransaction): string[] {
	return [
		neutralizeFormula(transaction.description),
		categoryLabels[transaction.category] ?? transaction.category,
		transaction.type === "income" ? "Receita" : "Despesa",
		new Date(transaction.date).toLocaleDateString("pt-BR"),
		`${transaction.type === "income" ? "+" : "-"}${formatCurrencyCents(transaction.amount)}`,
	];
}

function escapeCsvField(value: string): string {
	return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function toCsv(transactions: ExportableTransaction[]): string {
	return [HEADERS, ...transactions.map(toRow)].map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}

function downloadBlob(blob: Blob, fileName: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	link.click();
	URL.revokeObjectURL(url);
}

export async function exportTransactionsToXlsx(transactions: ExportableTransaction[]): Promise<void> {
	await writeExcelFile([HEADERS, ...transactions.map(toRow)]).toFile("transacoes.xlsx");
}

export function exportTransactionsToCsv(transactions: ExportableTransaction[]): void {
	// The BOM makes Excel open the UTF-8 file with accents intact.
	downloadBlob(new Blob([`﻿${toCsv(transactions)}`], { type: "text/csv;charset=utf-8" }), "transacoes.csv");
}
