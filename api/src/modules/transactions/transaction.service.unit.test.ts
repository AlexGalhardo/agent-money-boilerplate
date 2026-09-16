import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Transaction } from "../../../prisma/generated/client/client";
import { encrypt } from "../../lib/encryption";

const repositoryMock = {
	create: mock(),
	findById: mock(),
	findMany: mock(),
	count: mock(),
	update: mock(),
	delete: mock(),
	findAllForStats: mock(),
};

const prismaMock = {
	user: {
		findUniqueOrThrow: mock(),
		update: mock(),
	},
};

mock.module("./transaction.repository", () => ({ transactionRepository: repositoryMock }));
mock.module("../../config/prisma", () => ({ prisma: prismaMock }));

const { transactionService, TransactionNotFoundError } = await import("./transaction.service");

function mockFreeUser(freeTransactionCount = 0): void {
	prismaMock.user.findUniqueOrThrow.mockResolvedValue({
		planStatus: "inactive",
		planExpiresAt: null,
		freeTransactionCount,
	});
	prismaMock.user.update.mockResolvedValue({});
}

function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
	return {
		id: "tx-1",
		userId: "user-1",
		description: encrypt("Supermercado"),
		amount: encrypt("15000"),
		category: "food",
		type: "expense",
		date: new Date("2026-01-01T00:00:00.000Z"),
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: null,
		...overrides,
	};
}

describe("transactionService", () => {
	beforeEach(() => {
		for (const fn of Object.values(repositoryMock)) fn.mockReset();
		prismaMock.user.findUniqueOrThrow.mockReset();
		prismaMock.user.update.mockReset();
		mockFreeUser();
	});

	it("create() encrypts description/amount before persisting and decrypts the result", async () => {
		repositoryMock.create.mockResolvedValue(buildTransaction());

		const result = await transactionService.create("user-1", {
			description: "Supermercado",
			amount: 15000,
			category: "food",
			type: "expense",
		});

		expect(repositoryMock.create).toHaveBeenCalledTimes(1);
		const [createArgs] = repositoryMock.create.mock.calls[0] as [{ description: string; amount: string }];
		expect(createArgs.description).not.toBe("Supermercado");
		expect(createArgs.amount).not.toBe("15000");

		expect(result).toEqual({
			id: "tx-1",
			description: "Supermercado",
			amount: 15000,
			category: "food",
			type: "expense",
			date: "2026-01-01T00:00:00.000Z",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: null,
		});
	});

	it("create() increments the free-plan transaction counter on success", async () => {
		repositoryMock.create.mockResolvedValue(buildTransaction());
		mockFreeUser(3);

		await transactionService.create("user-1", {
			description: "Supermercado",
			amount: 15000,
			category: "food",
			type: "expense",
		});

		expect(prismaMock.user.update).toHaveBeenCalledWith({
			where: { id: "user-1" },
			data: { freeTransactionCount: { increment: 1 } },
		});
	});

	it("create() rejects once a free-plan user reaches the transaction limit", async () => {
		mockFreeUser(10);

		await expect(
			transactionService.create("user-1", {
				description: "Supermercado",
				amount: 15000,
				category: "food",
				type: "expense",
			}),
		).rejects.toThrow("Limite de 10 transações");

		expect(repositoryMock.create).not.toHaveBeenCalled();
	});

	it("create() ignores the free-plan limit for a user with an active plan", async () => {
		repositoryMock.create.mockResolvedValue(buildTransaction());
		prismaMock.user.findUniqueOrThrow.mockResolvedValue({
			planStatus: "active",
			planExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
			freeTransactionCount: 999,
		});
		prismaMock.user.update.mockResolvedValue({});

		await expect(
			transactionService.create("user-1", {
				description: "Supermercado",
				amount: 15000,
				category: "food",
				type: "expense",
			}),
		).resolves.toBeTruthy();

		expect(repositoryMock.create).toHaveBeenCalledTimes(1);
	});

	it("findById() throws TransactionNotFoundError when the repository returns null", async () => {
		repositoryMock.findById.mockResolvedValue(null);

		await expect(transactionService.findById("user-1", "missing")).rejects.toThrow(TransactionNotFoundError);
	});

	it("update() throws TransactionNotFoundError when nothing was updated", async () => {
		repositoryMock.update.mockResolvedValue(null);

		await expect(transactionService.update("user-1", "tx-1", { amount: 100 })).rejects.toThrow(
			TransactionNotFoundError,
		);
	});

	it("remove() throws TransactionNotFoundError when nothing was deleted", async () => {
		repositoryMock.delete.mockResolvedValue(false);

		await expect(transactionService.remove("user-1", "tx-1")).rejects.toThrow(TransactionNotFoundError);
	});

	it("list() filters by search term against the decrypted description, in-memory", async () => {
		repositoryMock.findMany.mockResolvedValue([
			buildTransaction({ id: "tx-1", description: encrypt("Supermercado") }),
			buildTransaction({ id: "tx-2", description: encrypt("Uber") }),
		]);

		const result = await transactionService.list("user-1", {
			search: "uber",
			page: 1,
			perPage: 20,
		});

		expect(result.total).toBe(1);
		expect(result.transactions[0]?.description).toBe("Uber");
	});

	it("list() paginates the decrypted, filtered results", async () => {
		repositoryMock.findMany.mockResolvedValue([
			buildTransaction({ id: "tx-1" }),
			buildTransaction({ id: "tx-2" }),
			buildTransaction({ id: "tx-3" }),
		]);

		const result = await transactionService.list("user-1", { page: 2, perPage: 2 });

		expect(result.total).toBe(3);
		expect(result.transactions).toHaveLength(1);
		expect(result.transactions[0]?.id).toBe("tx-3");
	});

	it("statsByCategory() computes percentages relative to each type's total", async () => {
		repositoryMock.findAllForStats.mockResolvedValue([
			{ amount: encrypt("300"), category: "food", type: "expense" },
			{ amount: encrypt("100"), category: "transport", type: "expense" },
			{ amount: encrypt("1000"), category: "salary", type: "income" },
		]);

		const stats = await transactionService.statsByCategory("user-1");
		const food = stats.find((row) => row.category === "food");
		const salary = stats.find((row) => row.category === "salary");

		expect(food).toMatchObject({ total: 300, percentage: 75 });
		expect(salary).toMatchObject({ total: 1000, percentage: 100 });
	});

	it("statsByCategory() returns rows sorted by total descending", async () => {
		repositoryMock.findAllForStats.mockResolvedValue([
			{ amount: encrypt("100"), category: "food", type: "expense" },
			{ amount: encrypt("500"), category: "transport", type: "expense" },
			{ amount: encrypt("300"), category: "housing", type: "expense" },
		]);

		const stats = await transactionService.statsByCategory("user-1");

		expect(stats.map((row) => row.category)).toEqual(["transport", "housing", "food"]);
	});
});
