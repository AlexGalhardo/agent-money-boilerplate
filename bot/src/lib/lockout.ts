export type LockoutStatus = { locked: false } | { locked: true; remainingMs: number };

export type Lockout = {
	check(chatId: number, now?: number): LockoutStatus;
	recordFailure(chatId: number, now?: number): LockoutStatus;
	recordSuccess(chatId: number): void;
	reset(): void;
};

type Entry = { failedAttempts: number; lockedUntil: number | null };

/**
 * Per-chat failed-attempt counter. State lives in memory: fine for the single
 * bot process this project runs (long polling allows only one), and a restart
 * simply unlocks everyone. Each use (login, personal password) gets its own
 * instance so failures in one flow don't lock the other.
 */
export function createLockout(options: { maxAttempts: number; lockoutMinutes: number }): Lockout {
	const state = new Map<number, Entry>();

	function check(chatId: number, now: number = Date.now()): LockoutStatus {
		const entry = state.get(chatId);
		if (!entry?.lockedUntil) return { locked: false };

		if (now >= entry.lockedUntil) {
			state.delete(chatId);
			return { locked: false };
		}

		return { locked: true, remainingMs: entry.lockedUntil - now };
	}

	return {
		check,
		recordFailure(chatId, now = Date.now()) {
			const entry = state.get(chatId) ?? { failedAttempts: 0, lockedUntil: null };
			entry.failedAttempts += 1;
			if (entry.failedAttempts >= options.maxAttempts) {
				entry.lockedUntil = now + options.lockoutMinutes * 60_000;
			}
			state.set(chatId, entry);
			return check(chatId, now);
		},
		recordSuccess(chatId) {
			state.delete(chatId);
		},
		reset() {
			state.clear();
		},
	};
}

export function remainingMinutes(status: { remainingMs: number }): number {
	return Math.ceil(status.remainingMs / 60_000);
}
