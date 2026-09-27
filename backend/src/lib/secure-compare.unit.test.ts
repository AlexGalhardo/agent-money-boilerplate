import { describe, expect, it } from "bun:test";
import { secureCompare } from "./secure-compare";

describe("secureCompare", () => {
	it("accepts the exact secret", () => {
		expect(secureCompare("s3cret", "s3cret")).toBe(true);
	});

	it("rejects a different secret, a prefix, or a missing value", () => {
		expect(secureCompare("s3cre", "s3cret")).toBe(false);
		expect(secureCompare("S3CRET", "s3cret")).toBe(false);
		expect(secureCompare(undefined, "s3cret")).toBe(false);
		expect(secureCompare(null, "s3cret")).toBe(false);
	});
});
