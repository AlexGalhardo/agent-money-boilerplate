import type { Prisma, Transaction } from "../../../prisma/generated/client/client";
import { prisma } from "../../config/prisma";
import { decrypt, encrypt } from "../../lib/encryption";
import { FREE_TRANSACTION_LIMIT, FreeLimitReachedError, hasActivePlan } from "../../lib/plan";
import { transactionRepository } from "./transaction.repository";
import type {
	CreateTransactionInput,
	ListTransactionsQuery,
	TransactionCategory,
	TransactionDTO,
	TransactionType,
	UpdateTransactionInput,
} from "./transaction.schema";

function toDTO(transaction: Transaction): TransactionDTO {
	return {
		id: transaction.id,
		description: decrypt(transaction.description),
		amount: Number(decrypt(transaction.amount)),
		category: transaction.category as TransactionCategory,
		type: transaction.type as TransactionType,
		date: transaction.date.toISOString(),
		createdAt: transaction.createdAt.toISOString(),
		updatedAt: transaction.updatedAt?.toISOString() ?? null,
	};
}

export class TransactionNotFoundError extends Error {
	constructor() {
		super("Transaction not found");
		this.name = "TransactionNotFoundError";
	}
}

export const transactionService = {
	async create(userId: string, input: CreateTransactionInput): Promise<TransactionDTO> {
		const user = await prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { planStatus: true, planExpiresAt: true, freeTransactionCount: true },
		});

		if (!hasActivePlan(user) && user.freeTransactionCount >= FREE_TRANSACTION_LIMIT) {
			throw new FreeLimitReachedError();
		}

		const created = await transactionRepository.create({
			userId,
			description: encrypt(input.description),
			amount: encrypt(String(input.amount)),
			category: input.category,
			type: input.type,
			...(input.date ? { date: new Date(input.date) } : {}),
		});

		await prisma.user.update({ where: { id: userId }, data: { freeTransactionCount: { increment: 1 } } });

		return toDTO(created);
	},

	async list(
		userId: string,
		query: ListTransactionsQuery,
	): Promise<{ transactions: TransactionDTO[]; total: number; page: number; perPage: number }> {
		const where: Prisma.TransactionWhereInput = {
			...(query.category ? { category: query.category } : {}),
			...(query.from || query.to
				? {
						date: {
							...(query.from ? { gte: new Date(query.from) } : {}),
							...(query.to ? { lte: new Date(query.to) } : {}),
						},
					}
				: {}),
		};

		// description e amount ficam criptografados no banco, então busca
		// textual (search) e paginação acontecem em memória, após decriptar.
		// Aceitável no volume desta aplicação (centenas de transações por
		// usuário); se o volume crescer, revisar para um índice de busca
		// dedicado que não exponha os dados em texto plano.
		const all = await transactionRepository.findMany(userId, where, 0, Number.MAX_SAFE_INTEGER);
		const decrypted = all.map(toDTO);

		const search = query.search?.toLowerCase();
		const filtered = search
			? decrypted.filter((transaction) => transaction.description.toLowerCase().includes(search))
			: decrypted;

		const start = (query.page - 1) * query.perPage;
		const page = filtered.slice(start, start + query.perPage);

		return { transactions: page, total: filtered.length, page: query.page, perPage: query.perPage };
	},

	async findById(userId: string, id: string): Promise<TransactionDTO> {
		const transaction = await transactionRepository.findById(id, userId);

		if (!transaction) {
			throw new TransactionNotFoundError();
		}

		return toDTO(transaction);
	},

	async update(userId: string, id: string, input: UpdateTransactionInput): Promise<TransactionDTO> {
		const data: Prisma.TransactionUncheckedUpdateInput = {
			...(input.description !== undefined ? { description: encrypt(input.description) } : {}),
			...(input.amount !== undefined ? { amount: encrypt(String(input.amount)) } : {}),
			...(input.category !== undefined ? { category: input.category } : {}),
			...(input.type !== undefined ? { type: input.type } : {}),
			...(input.date !== undefined ? { date: new Date(input.date) } : {}),
			updatedAt: new Date(),
		};

		const updated = await transactionRepository.update(id, userId, data);

		if (!updated) {
			throw new TransactionNotFoundError();
		}

		return toDTO(updated);
	},

	async remove(userId: string, id: string): Promise<void> {
		const deleted = await transactionRepository.delete(id, userId);

		if (!deleted) {
			throw new TransactionNotFoundError();
		}
	},

	async statsByCategory(
		userId: string,
	): Promise<{ category: string; type: TransactionType; total: number; percentage: number }[]> {
		const rows = await transactionRepository.findAllForStats(userId);

		const totals = new Map<string, { type: TransactionType; total: number }>();
		let incomeTotal = 0;
		let expenseTotal = 0;

		for (const row of rows) {
			const amount = Number(decrypt(row.amount));
			const type = row.type as TransactionType;
			const key = `${type}:${row.category}`;
			const current = totals.get(key)?.total ?? 0;
			totals.set(key, { type, total: current + amount });

			if (type === "income") {
				incomeTotal += amount;
			} else {
				expenseTotal += amount;
			}
		}

		return Array.from(totals.entries()).map(([key, value]) => {
			const category = key.split(":")[1] ?? "other";
			const base = value.type === "income" ? incomeTotal : expenseTotal;
			const percentage = base > 0 ? Number(((value.total / base) * 100).toFixed(2)) : 0;

			return { category, type: value.type, total: value.total, percentage };
		});
	},
};
