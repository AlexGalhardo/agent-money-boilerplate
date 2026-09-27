import { isStrongPassword, PASSWORD_RULES } from "./password-rules";

describe("password-rules", () => {
	it("accepts a password that meets every rule", () => {
		expect(isStrongPassword("Galhardyn123!")).toBe(true);
	});

	it("rejects a password missing complexity requirements", () => {
		expect(isStrongPassword("short")).toBe(false);
		expect(isStrongPassword("correcthorse123!")).toBe(false);
		expect(isStrongPassword("GALHARDYN123!")).toBe(false);
		expect(isStrongPassword("Galhardyn!!!!")).toBe(false);
		expect(isStrongPassword("Galhardyn1234")).toBe(false);
	});

	it("has exactly 5 rules", () => {
		expect(PASSWORD_RULES).toHaveLength(5);
	});
});
