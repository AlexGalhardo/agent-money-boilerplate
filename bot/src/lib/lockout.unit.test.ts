import { beforeEach, describe, expect, it } from "bun:test";
import { createLockout } from "./lockout";

const CHAT_ID = 1477312913;
const LOCKOUT_MINUTES = 15;
const lockout = createLockout({ maxAttempts: 3, lockoutMinutes: LOCKOUT_MINUTES });

describe("createLockout", () => {
	beforeEach(() => {
		lockout.reset();
	});

	it("starts unlocked for a chat with no history", () => {
		expect(lockout.check(CHAT_ID)).toEqual({ locked: false });
	});

	it("stays unlocked while failed attempts are below the max", () => {
		lockout.recordFailure(CHAT_ID);
		lockout.recordFailure(CHAT_ID);

		expect(lockout.check(CHAT_ID)).toEqual({ locked: false });
	});

	it("locks the chat once failed attempts reach the max", () => {
		const now = Date.now();
		lockout.recordFailure(CHAT_ID, now);
		lockout.recordFailure(CHAT_ID, now);
		const status = lockout.recordFailure(CHAT_ID, now);

		expect(status).toEqual({ locked: true, remainingMs: LOCKOUT_MINUTES * 60_000 });
	});

	it("unlocks automatically after the lockout window elapses", () => {
		const now = Date.now();
		for (let i = 0; i < 3; i++) lockout.recordFailure(CHAT_ID, now);

		expect(lockout.check(CHAT_ID, now + LOCKOUT_MINUTES * 60_000 + 1)).toEqual({ locked: false });
	});

	it("resets the failed-attempt counter on a successful attempt", () => {
		lockout.recordFailure(CHAT_ID);
		lockout.recordFailure(CHAT_ID);
		lockout.recordSuccess(CHAT_ID);
		lockout.recordFailure(CHAT_ID);

		expect(lockout.check(CHAT_ID)).toEqual({ locked: false });
	});

	it("tracks lockouts independently per chat id and per instance", () => {
		const now = Date.now();
		const other = createLockout({ maxAttempts: 3, lockoutMinutes: LOCKOUT_MINUTES });
		for (let i = 0; i < 3; i++) lockout.recordFailure(CHAT_ID, now);

		expect(lockout.check(CHAT_ID, now).locked).toBe(true);
		expect(lockout.check(999, now)).toEqual({ locked: false });
		expect(other.check(CHAT_ID, now)).toEqual({ locked: false });
	});
});
