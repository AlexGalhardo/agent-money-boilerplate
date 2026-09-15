import { prisma } from "../../config/prisma";
import { decrypt, encrypt } from "../../lib/encryption";
import { FREE_TRANSACTION_LIMIT, FreeLimitReachedError, hasActivePlan } from "../../lib/plan";
import { transactionRepository } from "./transaction.repository";
import type { TransactionCategory, TransactionType } from "./transaction.schema";
import type { ImportedTransactionInput } from "./transaction-import.schema";

export class ImportParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ImportParseError";
	}
}

type ParsedCsvRow = {
	rowNumber: number;
	date: Date;
	description: string;
	amountCents: number;
	type: TransactionType;
};

// O extrato do Nubank exporta datas no formato dd/mm/aaaa e valores com sinal
// (negativo = despesa, positivo = receita), sempre nesta ordem de colunas.
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

// Regras de categorização por palavra-chave, avaliadas em ordem. A primeira
// que casar vence. Transações que não casam nenhuma regra caem em "other" e
// são marcadas como needsReview para o usuário escolher a categoria na tela
// de revisão da importação, em vez de a aplicação decidir sozinha.
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
			const { category, matched } = categorizeDescription(row.description);
			return {
				rowNumber: row.rowNumber,
				createdAt: row.date.toISOString(),
				description: row.description,
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
		const user = await prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { planStatus: true, planExpiresAt: true, freeTransactionCount: true },
		});

		const existing = await transactionRepository.findManyForDedupe(userId);
		const existingKeys = new Set(
			existing.map((row) => dedupeKey(decrypt(row.description), Number(decrypt(row.amount)), row.date)),
		);

		const deduped = transactions.filter(
			(row) => !existingKeys.has(dedupeKey(row.description, row.amount, new Date(row.createdAt))),
		);

		// Plano gratuito: só aceita importar até completar o limite total de
		// transações — o restante do lote é descartado, não a importação inteira.
		const remainingAllowance = hasActivePlan(user)
			? deduped.length
			: Math.max(0, FREE_TRANSACTION_LIMIT - user.freeTransactionCount);
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

		await prisma.user.update({
			where: { id: userId },
			data: { freeTransactionCount: { increment: toCreate.length } },
		});

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
