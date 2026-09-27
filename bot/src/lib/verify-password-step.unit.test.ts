import { beforeEach, describe, expect, it } from "bun:test";
import { evaluatePasswordAttempt, passwordLockout } from "./verify-password-step";

const CHAT_ID = 555;
const CORRECT_PASSWORD = "test-password-123";

describe("evaluatePasswordAttempt", () => {
	beforeEach(() => {
		passwordLockout.reset();
	});

	it("returns correct for the right password", () => {
		expect(evaluatePasswordAttempt(CHAT_ID, CORRECT_PASSWORD)).toEqual({ outcome: "correct" });
	});

	it("returns incorrect for a wrong password", () => {
		expect(evaluatePasswordAttempt(CHAT_ID, "wrong-password")).toEqual({ outcome: "incorrect" });
	});

	it("locks out after BOT_MAX_ATTEMPTS wrong attempts (3, per .env.test)", () => {
		evaluatePasswordAttempt(CHAT_ID, "wrong");
		evaluatePasswordAttempt(CHAT_ID, "wrong");
		const result = evaluatePasswordAttempt(CHAT_ID, "wrong");

		expect(result.outcome).toBe("locked");
	});

	it("stays locked even with the correct password once locked out", () => {
		evaluatePasswordAttempt(CHAT_ID, "wrong");
		evaluatePasswordAttempt(CHAT_ID, "wrong");
		evaluatePasswordAttempt(CHAT_ID, "wrong");

		expect(evaluatePasswordAttempt(CHAT_ID, CORRECT_PASSWORD).outcome).toBe("locked");
	});

	it("tracks lockout independently per chat id", () => {
		evaluatePasswordAttempt(CHAT_ID, "wrong");
		evaluatePasswordAttempt(CHAT_ID, "wrong");
		evaluatePasswordAttempt(CHAT_ID, "wrong");

		expect(evaluatePasswordAttempt(999, CORRECT_PASSWORD)).toEqual({ outcome: "correct" });
	});
});
