import { normalizeTransaction } from "./normalize";

const base = { id: "1", description: "Uber", amount: 100, category: "transport" as const, type: "expense" as const };

describe("normalizeTransaction", () => {
	it("turns Date objects revived by Eden back into ISO strings", () => {
		const result = normalizeTransaction({
			...base,
			date: new Date("2026-09-27T12:00:00.000Z"),
			createdAt: new Date("2026-09-27T12:00:00.000Z"),
			updatedAt: null,
		});
		expect(result.date).toBe("2026-09-27T12:00:00.000Z");
		expect(result.date.slice(0, 10)).toBe("2026-09-27");
		expect(result.updatedAt).toBeNull();
	});

	it("keeps values that are already strings", () => {
		const result = normalizeTransaction({
			...base,
			date: "2026-01-02T00:00:00.000Z",
			createdAt: "2026-01-02T00:00:00.000Z",
			updatedAt: "2026-01-03T00:00:00.000Z",
		});
		expect(result.date).toBe("2026-01-02T00:00:00.000Z");
		expect(result.updatedAt).toBe("2026-01-03T00:00:00.000Z");
	});
});
