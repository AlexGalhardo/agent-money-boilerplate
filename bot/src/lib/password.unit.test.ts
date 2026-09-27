import { describe, expect, it } from "bun:test";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
	it("hashes a password into a bcrypt hash, not the plain text", () => {
		const hash = hashPassword("correcthorse");

		expect(hash).not.toBe("correcthorse");
		expect(hash).toMatch(/^\$2[aby]\$/);
	});

	it("verifies the correct password against its hash", () => {
		const hash = hashPassword("correcthorse");

		expect(verifyPassword("correcthorse", hash)).toBe(true);
	});

	it("rejects an incorrect password", () => {
		const hash = hashPassword("correcthorse");

		expect(verifyPassword("senha-errada", hash)).toBe(false);
	});

	it("produces a different hash each time (random salt)", () => {
		const first = hashPassword("correcthorse");
		const second = hashPassword("correcthorse");

		expect(first).not.toBe(second);
		expect(verifyPassword("correcthorse", first)).toBe(true);
		expect(verifyPassword("correcthorse", second)).toBe(true);
	});
});
