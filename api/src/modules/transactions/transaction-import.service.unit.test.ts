import { beforeEach, describe, expect, it, mock } from "bun:test";
import { encrypt } from "../../lib/encryption";

const repositoryMock = {
	findManyForDedupe: mock(),
	createMany: mock(),
};

const prismaMock = {
	user: {
		findUniqueOrThrow: mock(),
		update: mock(),
	},
};

mock.module("./transaction.repository", () => ({ transactionRepository: repositoryMock }));
mock.module("../../config/prisma", () => ({ prisma: prismaMock }));

const { categorizeDescription, parseNubankCsv, transactionImportService, ImportParseError } = await import(
	"./transaction-import.service"
);

const NUBANK_HEADER = "Data,Valor,Identificador,Descrição";

describe("parseNubankCsv", () => {
	it("parses rows, treating negative values as expense and positive as income", () => {
		const csv = [
			NUBANK_HEADER,
			"01/08/2026,-30.00,id-1,Transferência enviada pelo Pix - Fulano",
			"07/08/2026,500.00,id-2,Resgate RDB",
		].join("\n");

		const rows = parseNubankCsv(csv);

		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({ amountCents: 3000, type: "expense" });
		expect(rows[1]).toMatchObject({ amountCents: 50000, type: "income" });
		expect(rows[0]?.date.toISOString()).toBe("2026-08-01T12:00:00.000Z");
	});

	it("keeps commas inside the description column intact", () => {
		const csv = [NUBANK_HEADER, "01/08/2026,-10.00,id-1,Loja X, Filial Centro"].join("\n");

		const rows = parseNubankCsv(csv);

		expect(rows[0]?.description).toBe("Loja X, Filial Centro");
	});

	it("throws ImportParseError when the header doesn't match a Nubank export", () => {
		const csv = ["Date,Amount,Id,Desc", "01/08/2026,-10.00,id-1,X"].join("\n");

		expect(() => parseNubankCsv(csv)).toThrow(ImportParseError);
	});

	it("throws ImportParseError on an invalid date", () => {
		const csv = [NUBANK_HEADER, "2026-08-01,-10.00,id-1,X"].join("\n");

		expect(() => parseNubankCsv(csv)).toThrow(ImportParseError);
	});

	it("throws ImportParseError on an invalid amount", () => {
		const csv = [NUBANK_HEADER, "01/08/2026,abc,id-1,X"].join("\n");

		expect(() => parseNubankCsv(csv)).toThrow(ImportParseError);
	});
});

describe("categorizeDescription", () => {
	const cases: [string, string][] = [
		["Aplicação RDB", "investment"],
		["Resgate RDB", "investment"],
		["Transferência enviada pelo Pix - RAFA LANCHES", "food"],
		["FABIANA X. DA SILVA MARMITARIA", "food"],
		["Pagamento de boleto efetuado - TOKIO MARINE SEGURADORA S.A.", "insurance"],
		["Pagamento de fatura", "credit_card_bill"],
		["Transferência enviada pelo Pix - Fulano de Tal", "transfers"],
		["Transferência recebida pelo Pix - Ciclano", "transfers"],
	];

	it.each(cases)("categorizes %s as %s", (description, expected) => {
		const result = categorizeDescription(description);
		expect(result.category as string).toBe(expected);
		expect(result.matched).toBe(true);
	});

	it("falls back to 'other' and flags needsReview when nothing matches", () => {
		const result = categorizeDescription("Compra totalmente desconhecida XYZ");
		expect(result).toEqual({ category: "other", matched: false });
	});

	it("does not match 'SEGURO' inside unrelated words like PAGSEGURO", () => {
		const result = categorizeDescription(
			"Transferência enviada pelo Pix - Luciana Moraes - PAGSEGURO INTERNET IP S.A. (0290)",
		);
		expect(result.category as string).toBe("transfers");
	});
});

describe("transactionImportService.preview", () => {
	it("summarizes matched/needsReview and income/expense counts", () => {
		const csv = [
			NUBANK_HEADER,
			"01/08/2026,-30.00,id-1,Transferência enviada pelo Pix - Fulano",
			"02/08/2026,-50.00,id-2,Compra desconhecida",
			"03/08/2026,100.00,id-3,Resgate RDB",
		].join("\n");

		const result = transactionImportService.preview(csv);

		expect(result.summary).toEqual({ total: 3, needsReview: 1, income: 1, expense: 2 });
		expect(result.rows.find((row) => row.description === "Compra desconhecida")?.needsReview).toBe(true);
	});
});

describe("transactionImportService.confirm", () => {
	beforeEach(() => {
		repositoryMock.findManyForDedupe.mockReset();
		repositoryMock.createMany.mockReset();
		prismaMock.user.findUniqueOrThrow.mockReset();
		prismaMock.user.update.mockReset();
		prismaMock.user.update.mockResolvedValue({});
	});

	it("creates all rows when nothing overlaps existing transactions", async () => {
		prismaMock.user.findUniqueOrThrow.mockResolvedValue({
			planStatus: "inactive",
			planExpiresAt: null,
			freeTransactionCount: 0,
		});
		repositoryMock.findManyForDedupe.mockResolvedValue([]);
		repositoryMock.createMany.mockResolvedValue(1);

		const result = await transactionImportService.confirm("user-1", [
			{
				description: "Resgate RDB",
				amount: 50000,
				category: "investment",
				type: "income",
				createdAt: "2026-08-03T12:00:00.000Z",
			},
		]);

		expect(result).toEqual({ created: 1, skippedDuplicates: 0, skippedLimit: 0 });
		expect(repositoryMock.createMany).toHaveBeenCalledTimes(1);
	});

	it("skips rows that already exist for the same description, amount and day", async () => {
		prismaMock.user.findUniqueOrThrow.mockResolvedValue({
			planStatus: "inactive",
			planExpiresAt: null,
			freeTransactionCount: 0,
		});
		repositoryMock.findManyForDedupe.mockResolvedValue([
			{
				description: encrypt("Resgate RDB"),
				amount: encrypt("50000"),
				date: new Date("2026-08-03T12:00:00.000Z"),
			},
		]);

		const result = await transactionImportService.confirm("user-1", [
			{
				description: "Resgate RDB",
				amount: 50000,
				category: "investment",
				type: "income",
				createdAt: "2026-08-03T12:00:00.000Z",
			},
		]);

		expect(result).toEqual({ created: 0, skippedDuplicates: 1, skippedLimit: 0 });
		expect(repositoryMock.createMany).not.toHaveBeenCalled();
	});

	it("caps free-plan imports at the remaining allowance and reports skippedLimit", async () => {
		prismaMock.user.findUniqueOrThrow.mockResolvedValue({
			planStatus: "inactive",
			planExpiresAt: null,
			freeTransactionCount: 8,
		});
		repositoryMock.findManyForDedupe.mockResolvedValue([]);
		repositoryMock.createMany.mockResolvedValue(2);

		const rows = ["a", "b", "c"].map((label) => ({
			description: `Compra ${label}`,
			amount: 1000,
			category: "food" as const,
			type: "expense" as const,
			createdAt: "2026-08-03T12:00:00.000Z",
		}));

		const result = await transactionImportService.confirm("user-1", rows);

		expect(result).toEqual({ created: 2, skippedDuplicates: 0, skippedLimit: 1 });
		expect(prismaMock.user.update).toHaveBeenCalledWith({
			where: { id: "user-1" },
			data: { freeTransactionCount: { increment: 2 } },
		});
	});

	it("rejects the import when the free-plan limit is already reached", async () => {
		prismaMock.user.findUniqueOrThrow.mockResolvedValue({
			planStatus: "inactive",
			planExpiresAt: null,
			freeTransactionCount: 10,
		});
		repositoryMock.findManyForDedupe.mockResolvedValue([]);

		await expect(
			transactionImportService.confirm("user-1", [
				{
					description: "Resgate RDB",
					amount: 50000,
					category: "investment",
					type: "income",
					createdAt: "2026-08-03T12:00:00.000Z",
				},
			]),
		).rejects.toThrow("Limite de 10 transações");

		expect(repositoryMock.createMany).not.toHaveBeenCalled();
	});
});
