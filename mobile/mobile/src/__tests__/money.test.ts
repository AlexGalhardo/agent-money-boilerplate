import {
	allocateCents,
	compoundInterestCents,
	convertCents,
	simpleInterestCents,
	summarize,
	toCents,
} from "@op/shared/money";

describe("financial math (big.js)", () => {
	test("summarize nets income vs expense with no float drift", () => {
		const lines = Array.from({ length: 300 }, () => ({
			type: "expense" as const,
			amountCents: 1,
		}));
		lines.push({ type: "income", amountCents: 500 } as never);
		const r = summarize(lines);
		expect(r.expense).toBe(300);
		expect(r.income).toBe(500);
		expect(r.balance).toBe(200);
	});

	test.each([
		[0.5, 1],
		[1.5, 2],
		[2.5, 3],
		[-2.5, -3],
		[10.994, 11],
		[10.995, 11],
	])("toCents(%p) === %p (half-up)", (input, expected) => {
		expect(toCents(input)).toBe(expected);
	});

	test("convertCents applies a decimal rate and rounds to whole cents", () => {
		expect(convertCents(10000, 0.1987)).toBe(1987);
		expect(convertCents(101, 0.5)).toBe(51);
	});

	test("simple interest: 12%/yr on R$1000 for 365d = R$120", () => {
		expect(simpleInterestCents(100000, 0.12, 365)).toBe(12000);
	});

	test("compound interest: 1%/mo x12 on R$1000 = R$126,83", () => {
		expect(compoundInterestCents(100000, 0.01, 12)).toBe(12683);
		expect(compoundInterestCents(100000, 0.02, 0)).toBe(0);
	});

	test("allocateCents always sums back to the input", () => {
		for (const [amount, parts] of [
			[100, 3],
			[99999999, 13],
			[1, 7],
		] as const) {
			const split = allocateCents(amount, parts);
			expect(split).toHaveLength(parts);
			expect(split.reduce((a, b) => a + b, 0)).toBe(amount);
		}
		expect(allocateCents(100, 3)).toEqual([34, 33, 33]);
	});
});
