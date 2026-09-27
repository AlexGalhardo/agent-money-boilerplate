import { describe, expect, it } from "bun:test";
import type { Transaction } from "./queries";
import { paginate, searchTransactions, sumByType } from "./transaction-search";

function tx(description: string, amount: number, type: Transaction["type"] = "expense"): Transaction {
	return { id: description, description, amount, type, category: "other", date: "", createdAt: "", updatedAt: null };
}

describe("transaction search", () => {
	const list = [tx("PAGAMENTO PADARIA SÃO JOSÉ", 1000), tx("Salário", 5000, "income"), tx("Uber", 200)];

	it("matches mid-string, ignoring accents and case", () => {
		expect(searchTransactions(list, "sao jose").map((t) => t.id)).toEqual(["PAGAMENTO PADARIA SÃO JOSÉ"]);
		expect(searchTransactions(list, "salario")).toHaveLength(1);
	});

	it("ignores terms shorter than 3 characters", () => {
		expect(searchTransactions(list, "ub")).toHaveLength(3);
	});

	it("sums amounts per type", () => {
		expect(sumByType(list, "expense")).toBe(1200);
		expect(sumByType(list, "income")).toBe(5000);
	});

	it("paginates and clamps the page into range", () => {
		const items = Array.from({ length: 25 }, (_, i) => i);
		expect(paginate(items, 3, 10)).toEqual({ items: [20, 21, 22, 23, 24], page: 3, totalPages: 3 });
		expect(paginate(items, 9, 10).page).toBe(3);
		expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, totalPages: 1 });
	});
});
