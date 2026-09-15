import type { Prisma, Transaction } from "../../../prisma/generated/client/client";
import { prisma } from "../../config/prisma";

export const transactionRepository = {
	create(data: Prisma.TransactionUncheckedCreateInput): Promise<Transaction> {
		return prisma.transaction.create({ data });
	},

	findById(id: string, userId: string): Promise<Transaction | null> {
		return prisma.transaction.findFirst({ where: { id, userId } });
	},

	findMany(userId: string, where: Prisma.TransactionWhereInput, skip: number, take: number): Promise<Transaction[]> {
		return prisma.transaction.findMany({
			where: { userId, ...where },
			orderBy: { date: "desc" },
			skip,
			take,
		});
	},

	count(userId: string, where: Prisma.TransactionWhereInput): Promise<number> {
		return prisma.transaction.count({ where: { userId, ...where } });
	},

	async update(
		id: string,
		userId: string,
		data: Prisma.TransactionUncheckedUpdateInput,
	): Promise<Transaction | null> {
		const result = await prisma.transaction.updateMany({ where: { id, userId }, data });

		if (result.count === 0) {
			return null;
		}

		return transactionRepository.findById(id, userId);
	},

	async delete(id: string, userId: string): Promise<boolean> {
		const result = await prisma.transaction.deleteMany({ where: { id, userId } });
		return result.count > 0;
	},

	findAllForStats(userId: string): Promise<Pick<Transaction, "amount" | "category" | "type">[]> {
		return prisma.transaction.findMany({
			where: { userId },
			select: { amount: true, category: true, type: true },
		});
	},

	findManyForDedupe(userId: string): Promise<Pick<Transaction, "description" | "amount" | "date">[]> {
		return prisma.transaction.findMany({
			where: { userId },
			select: { description: true, amount: true, date: true },
		});
	},

	async createMany(data: Prisma.TransactionUncheckedCreateInput[]): Promise<number> {
		const result = await prisma.transaction.createMany({ data });
		return result.count;
	},
};
