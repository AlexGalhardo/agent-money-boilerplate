import { describe, expect, it } from "bun:test";
import { chunk } from "./chunk";

describe("chunk", () => {
	it("splits an array into fixed-size groups", () => {
		expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
	});

	it("returns an empty array for an empty input", () => {
		expect(chunk([], 2)).toEqual([]);
	});
});
