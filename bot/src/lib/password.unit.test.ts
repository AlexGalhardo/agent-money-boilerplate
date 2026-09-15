import { describe, expect, it } from "bun:test";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
	it("hashes a password into a bcrypt hash, not the plain text", () => {
		const hash = hashPassword("galhardyn");

		expect(hash).not.toBe("galhardyn");
		expect(hash).toMatch(/^\$2[aby]\$/);
	});

	it("verifies the correct password against its hash", () => {
		const hash = hashPassword("galhardyn");

		expect(verifyPassword("galhardyn", hash)).toBe(true);
	});

	it("rejects an incorrect password", () => {
		const hash = hashPassword("galhardyn");

		expect(verifyPassword("senha-errada", hash)).toBe(false);
	});

	it("produces a different hash each time (random salt)", () => {
		const first = hashPassword("galhardyn");
		const second = hashPassword("galhardyn");

		expect(first).not.toBe(second);
		expect(verifyPassword("galhardyn", first)).toBe(true);
		expect(verifyPassword("galhardyn", second)).toBe(true);
	});
});
