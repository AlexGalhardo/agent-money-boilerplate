import { describe, expect, it } from "bun:test";
import { generateStrongPassword } from "./generate-password";

describe("generateStrongPassword", () => {
	it("generates a password with the requested length", () => {
		expect(generateStrongPassword(32)).toHaveLength(32);
		expect(generateStrongPassword(8)).toHaveLength(8);
	});

	it("includes at least one lowercase, uppercase, digit and symbol", () => {
		const password = generateStrongPassword(32);

		expect(password).toMatch(/[a-z]/);
		expect(password).toMatch(/[A-Z]/);
		expect(password).toMatch(/[0-9]/);
		expect(password).toMatch(/[!@#$%^&*()\-_=+]/);
	});

	it("generates a different password on each call", () => {
		expect(generateStrongPassword(32)).not.toBe(generateStrongPassword(32));
	});
});
