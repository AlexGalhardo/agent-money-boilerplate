import { decrypt, encrypt } from "../../lib/encryption";
import { AppError } from "../../lib/errors";
import { FreeLimitReachedError, transactionAllowance } from "../../lib/plan";
import { userRepository } from "../users/user.repository";
import { transactionRepository } from "./transaction.repository";
import type { TransactionCategory, TransactionType } from "./transaction.schema";
import type { ImportedTransactionInput } from "./transaction-import.schema";

export class ImportParseError extends AppError {
	constructor(message: string) {
		super(message, 400);
	}
}

type ParsedCsvRow = {
	rowNumber: number;
	date: Date;
	description: string;
	amountCents: number;
	type: TransactionType;
};

// Nubank statements export dates as dd/mm/yyyy and signed values
// (negative = expense, positive = income), always in this column order.
const NUBANK_HEADER_PREFIX = "data,valor,identificador";
const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function parseNubankCsv(csv: string): ParsedCsvRow[] {
	const lines = csv
		.split(/\r\n|\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		throw new ImportParseError("Arquivo CSV vazio");
	}

	const [header, ...dataLines] = lines;
	if (!header?.toLowerCase().startsWith(NUBANK_HEADER_PREFIX)) {
		throw new ImportParseError(
			"Formato de CSV não reconhecido. Esperado um extrato do Nubank com colunas Data,Valor,Identificador,Descrição.",
		);
	}

	if (dataLines.length === 0) {
		throw new ImportParseError("O arquivo não contém nenhuma transação");
	}

	return dataLines.map((line, index) => {
		const rowNumber = index + 2;
		const parts = line.split(",");

		if (parts.length < 4) {
			throw new ImportParseError(`Linha ${rowNumber}: formato inválido (esperado 4 colunas)`);
		}

		const [rawDate, rawValue, , ...descriptionParts] = parts;
		const description = descriptionParts.join(",").trim().replace(/^"|"$/g, "") || "Transação importada";

		const dateMatch = rawDate?.trim().match(DATE_PATTERN);
		if (!dateMatch) {
			throw new ImportParseError(`Linha ${rowNumber}: data inválida "${rawDate}"`);
		}
		const [, day, month, year] = dateMatch;
		const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));

		const value = Number.parseFloat((rawValue ?? "").trim());
		if (Number.isNaN(value)) {
			throw new ImportParseError(`Linha ${rowNumber}: valor inválido "${rawValue}"`);
		}

		return {
			rowNumber,
			date,
			description,
			amountCents: Math.round(Math.abs(value) * 100),
			type: value < 0 ? "expense" : "income",
		};
	});
}

// Keyword categorization rules, evaluated in order — the first match wins.
// Rows matching nothing fall back to "other" and are flagged needsReview so
// the user picks the category on the import review screen, instead of the
// app guessing.
const CATEGORY_RULES: { pattern: RegExp; category: TransactionCategory }[] = [
	{ pattern: /\bRDB\b/i, category: "investment" },
	{ pattern: /LANCHONETE|LANCHES|MARMITARIA|RESTAURANTE|PADARIA|A[ÇC]OUGUE|SUPERMERCADO|IFOOD/i, category: "food" },
	{ pattern: /SEGURADORA|\bSEGURO\b/i, category: "insurance" },
	{ pattern: /PAGAMENTO DE FATURA/i, category: "credit_card_bill" },
	{ pattern: /TRANSFER[ÊE]NCIA (ENVIADA|RECEBIDA) PELO PIX/i, category: "transfers" },
];

export function categorizeDescription(description: string): { category: TransactionCategory; matched: boolean } {
	for (const rule of CATEGORY_RULES) {
		if (rule.pattern.test(description)) {
			return { category: rule.category, matched: true };
		}
	}
	return { category: "other", matched: false };
}

export type ImportPreviewRow = {
	rowNumber: number;
	createdAt: string;
	description: string;
	amount: number;
	type: TransactionType;
	category: TransactionCategory;
	needsReview: boolean;
};

export type ImportPreviewResult = {
	rows: ImportPreviewRow[];
	summary: { total: number; needsReview: number; income: number; expense: number };
};

export const transactionImportService = {
	preview(csv: string): ImportPreviewResult {
		const parsed = parseNubankCsv(csv);

		const rows: ImportPreviewRow[] = parsed.map((row) => {
			// Imported descriptions follow the same UPPERCASE convention as
			// manually created ones (see TransactionForm).
			const description = row.description.toUpperCase();
			const { category, matched } = categorizeDescription(description);
			return {
				rowNumber: row.rowNumber,
				createdAt: row.date.toISOString(),
				description,
				amount: row.amountCents,
				type: row.type,
				category,
				needsReview: !matched,
			};
		});

		const summary = {
			total: rows.length,
			needsReview: rows.filter((row) => row.needsReview).length,
			income: rows.filter((row) => row.type === "income").length,
			expense: rows.filter((row) => row.type === "expense").length,
		};

		return { rows, summary };
	},

	async confirm(
		userId: string,
		transactions: ImportedTransactionInput[],
	): Promise<{ created: number; skippedDuplicates: number; skippedLimit: number }> {
		const quota = await userRepository.findPlanQuota(userId);

		// Enforces UPPERCASE even when a client skips the preview step (direct
		// API use) — same convention as manually created transactions.
		const normalized = transactions.map((row) => ({ ...row, description: row.description.toUpperCase() }));

		const existing = await transactionRepository.findManyForDedupe(userId);
		const existingKeys = new Set(
			existing.map((row) => dedupeKey(decrypt(row.description), Number(decrypt(row.amount)), row.date)),
		);

		const deduped = normalized.filter(
			(row) => !existingKeys.has(dedupeKey(row.description, row.amount, new Date(row.createdAt))),
		);

		// Free plan: import only up to the remaining allowance — the rest of the
		// batch is dropped, not the whole import.
		const remainingAllowance = transactionAllowance(quota);
		const toCreate = deduped.slice(0, remainingAllowance);
		const skippedLimit = deduped.length - toCreate.length;

		if (toCreate.length === 0) {
			if (skippedLimit > 0 && remainingAllowance === 0) {
				throw new FreeLimitReachedError();
			}
			return { created: 0, skippedDuplicates: transactions.length, skippedLimit: 0 };
		}

		await transactionRepository.createMany(
			toCreate.map((row) => ({
				userId,
				description: encrypt(row.description),
				amount: encrypt(String(row.amount)),
				category: row.category,
				type: row.type,
				date: new Date(row.createdAt),
			})),
		);

		await userRepository.incrementFreeTransactionCount(userId, toCreate.length);

		return {
			created: toCreate.length,
			skippedDuplicates: transactions.length - deduped.length,
			skippedLimit,
		};
	},
};

function dedupeKey(description: string, amountCents: number, date: Date): string {
	return `${description}|${amountCents}|${date.toISOString().slice(0, 10)}`;
}
