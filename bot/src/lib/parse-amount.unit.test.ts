import { describe, expect, it } from "bun:test";
import { parseAmountToCents } from "./parse-amount";

describe("parseAmountToCents", () => {
	it("converts a dot-decimal value to cents", () => {
		expect(parseAmountToCents("49.90")).toBe(4990);
	});

	it("converts a comma-decimal value to cents", () => {
		expect(parseAmountToCents("49,90")).toBe(4990);
	});

	it("rounds fractional cents", () => {
		expect(parseAmountToCents("10.999")).toBe(1100);
	});

	it("rejects zero", () => {
		expect(parseAmountToCents("0")).toBeNull();
	});

	it("rejects negative values", () => {
		expect(parseAmountToCents("-5")).toBeNull();
	});

	it("rejects non-numeric text", () => {
		expect(parseAmountToCents("não é um número")).toBeNull();
	});
});
