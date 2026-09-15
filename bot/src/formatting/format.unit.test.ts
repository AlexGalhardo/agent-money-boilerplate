import { describe, expect, it } from "bun:test";
import { formatCurrencyCents, formatDate, formatTransactionList, getCategoryLabel } from "./format";

// toLocaleString com currency:"BRL" separa "R$" do valor com um espaço
// inquebrável (U+00A0), não um espaço comum.
const NBSP = " ";

describe("formatCurrencyCents", () => {
	it("formats cents as BRL currency", () => {
		expect(formatCurrencyCents(150000)).toBe(`R$${NBSP}1.500,00`);
		expect(formatCurrencyCents(250)).toBe(`R$${NBSP}2,50`);
	});
});

describe("formatDate", () => {
	it("formats an ISO string as dd/mm/aaaa in UTC", () => {
		expect(formatDate("2026-08-01T12:00:00.000Z")).toBe("01/08/2026");
	});
});

describe("getCategoryLabel", () => {
	it("returns the Portuguese label for a known category", () => {
		expect(getCategoryLabel("credit_card_bill")).toBe("Fatura do cartão");
		expect(getCategoryLabel("transfers")).toBe("Transferências");
	});

	it("falls back to the raw value for an unknown category", () => {
		expect(getCategoryLabel("something_new")).toBe("something_new");
	});
});

describe("formatTransactionList", () => {
	it("returns a friendly message for an empty list", () => {
		expect(formatTransactionList([])).toBe("Nenhuma transação encontrada.");
	});

	it("numbers each transaction and includes sign, value, category and date", () => {
		const result = formatTransactionList([
			{
				id: "1",
				description: "Resgate RDB",
				amount: 50000,
				category: "investment",
				type: "income",
				createdAt: "2026-08-07T12:00:00.000Z",
			},
			{
				id: "2",
				description: "Pagamento de fatura",
				amount: 10000,
				category: "credit_card_bill",
				type: "expense",
				createdAt: "2026-08-27T12:00:00.000Z",
			},
		]);

		expect(result).toContain(`1. +R$${NBSP}500,00 · Investimentos · 07/08/2026`);
		expect(result).toContain(`2. -R$${NBSP}100,00 · Fatura do cartão · 27/08/2026`);
	});
});
