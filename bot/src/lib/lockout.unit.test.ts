import { beforeEach, describe, expect, it } from "bun:test";
import { checkLockout, recordFailedAttempt, recordSuccessfulAttempt, resetLockoutState } from "./lockout";

const CHAT_ID = 1477312913;
const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 15;

describe("lockout", () => {
	beforeEach(() => {
		resetLockoutState();
	});

	it("starts unlocked for a chat with no history", () => {
		expect(checkLockout(CHAT_ID)).toEqual({ locked: false });
	});

	it("stays unlocked while failed attempts are below the max", () => {
		recordFailedAttempt(CHAT_ID, MAX_ATTEMPTS, LOCKOUT_MINUTES);
		recordFailedAttempt(CHAT_ID, MAX_ATTEMPTS, LOCKOUT_MINUTES);

		expect(checkLockout(CHAT_ID)).toEqual({ locked: false });
	});

	it("locks the chat once failed attempts reach the max", () => {
		const now = Date.now();
		recordFailedAttempt(CHAT_ID, MAX_ATTEMPTS, LOCKOUT_MINUTES, now);
		recordFailedAttempt(CHAT_ID, MAX_ATTEMPTS, LOCKOUT_MINUTES, now);
		const status = recordFailedAttempt(CHAT_ID, MAX_ATTEMPTS, LOCKOUT_MINUTES, now);

		expect(status.locked).toBe(true);
		if (status.locked) {
			expect(status.remainingMs).toBe(LOCKOUT_MINUTES * 60_000);
		}
	});

	it("unlocks automatically after the lockout window elapses", () => {
		const now = Date.now();
		recordFailedAttempt(CHAT_ID, MAX_ATTEMPTS, LOCKOUT_MINUTES, now);
		recordFailedAttempt(CHAT_ID, MAX_ATTEMPTS, LOCKOUT_MINUTES, now);
		recordFailedAttempt(CHAT_ID, MAX_ATTEMPTS, LOCKOUT_MINUTES, now);

		const afterLockoutExpires = now + LOCKOUT_MINUTES * 60_000 + 1;
		expect(checkLockout(CHAT_ID, afterLockoutExpires)).toEqual({ locked: false });
	});

	it("resets the failed-attempt counter on a successful attempt", () => {
		recordFailedAttempt(CHAT_ID, MAX_ATTEMPTS, LOCKOUT_MINUTES);
		recordFailedAttempt(CHAT_ID, MAX_ATTEMPTS, LOCKOUT_MINUTES);
		recordSuccessfulAttempt(CHAT_ID);

		recordFailedAttempt(CHAT_ID, MAX_ATTEMPTS, LOCKOUT_MINUTES);
		expect(checkLockout(CHAT_ID)).toEqual({ locked: false });
	});

	it("tracks lockouts independently per chat id", () => {
		const now = Date.now();
		recordFailedAttempt(CHAT_ID, MAX_ATTEMPTS, LOCKOUT_MINUTES, now);
		recordFailedAttempt(CHAT_ID, MAX_ATTEMPTS, LOCKOUT_MINUTES, now);
		recordFailedAttempt(CHAT_ID, MAX_ATTEMPTS, LOCKOUT_MINUTES, now);

		expect(checkLockout(CHAT_ID, now).locked).toBe(true);
		expect(checkLockout(999, now)).toEqual({ locked: false });
	});
});
