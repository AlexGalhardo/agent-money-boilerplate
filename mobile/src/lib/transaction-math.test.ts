import { matchesSearch, totals } from "./transaction-math";

describe("transaction math", () => {
	it("matches a term anywhere, ignoring accents and case", () => {
		expect(matchesSearch("PAGAMENTO PADARIA SÃO JOSÉ", "sao jose")).toBe(true);
		expect(matchesSearch("Uber", "  ube ")).toBe(true);
		expect(matchesSearch("Uber", "taxi")).toBe(false);
	});

	it("sums income and expense and derives the balance", () => {
		expect(
			totals([
				{ type: "income", amount: 5000 },
				{ type: "expense", amount: 1200 },
				{ type: "expense", amount: 300 },
			]),
		).toEqual({ income: 5000, expense: 1500, balance: 3500 });
		expect(totals([])).toEqual({ income: 0, expense: 0, balance: 0 });
	});
});
