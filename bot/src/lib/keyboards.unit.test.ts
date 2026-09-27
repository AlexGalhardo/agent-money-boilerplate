import { describe, expect, it } from "bun:test";
import { parseCategoryCallback } from "./keyboards";

describe("parseCategoryCallback", () => {
	it("accepts a known category", () => {
		expect(parseCategoryCallback("cat:food")).toBe("food");
	});

	it("rejects unknown categories and foreign callbacks", () => {
		expect(parseCategoryCallback("cat:not-a-category")).toBeNull();
		expect(parseCategoryCallback("menu:food")).toBeNull();
	});
});
