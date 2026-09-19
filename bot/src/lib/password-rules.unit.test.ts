import { describe, expect, it } from "bun:test";
import { failingPasswordRules, isStrongPassword } from "./password-rules";

describe("password-rules", () => {
	it("accepts a password that meets every rule", () => {
		expect(isStrongPassword("Galhardyn123!")).toBe(true);
		expect(failingPasswordRules("Galhardyn123!")).toEqual([]);
	});

	it("rejects a password shorter than 8 characters", () => {
		expect(isStrongPassword("Ab1!")).toBe(false);
	});

	it("rejects a password longer than 32 characters", () => {
		expect(isStrongPassword(`Aa1!${"a".repeat(30)}`)).toBe(false);
	});

	it("rejects a password missing an uppercase letter", () => {
		expect(isStrongPassword("galhardyn123!")).toBe(false);
	});

	it("rejects a password missing a number", () => {
		expect(isStrongPassword("Galhardyn!!")).toBe(false);
	});

	it("rejects a password missing a special character", () => {
		expect(isStrongPassword("Galhardyn123")).toBe(false);
	});

	it("lists only the rules that still fail", () => {
		const failing = failingPasswordRules("galhardyn");

		expect(failing).toContain("Uma letra maiúscula (A-Z)");
		expect(failing).toContain("Um número (0-9)");
		expect(failing).toContain("Um caractere especial (ex: !@#$%)");
		expect(failing).not.toContain("Entre 8 e 32 caracteres");
	});
});
