// Estado em memória, por chat id — aceitável porque o bot roda como um único
// processo, para um único usuário. Reinicia (destrava tudo) se o bot reiniciar.
type LockoutEntry = { failedAttempts: number; lockedUntil: number | null };

const state = new Map<number, LockoutEntry>();

export type LockoutStatus = { locked: false } | { locked: true; remainingMs: number };

export function checkLockout(chatId: number, now: number = Date.now()): LockoutStatus {
	const entry = state.get(chatId);
	if (!entry?.lockedUntil) {
		return { locked: false };
	}

	if (now >= entry.lockedUntil) {
		state.delete(chatId);
		return { locked: false };
	}

	return { locked: true, remainingMs: entry.lockedUntil - now };
}

export function recordFailedAttempt(
	chatId: number,
	maxAttempts: number,
	lockoutMinutes: number,
	now: number = Date.now(),
): LockoutStatus {
	const entry = state.get(chatId) ?? { failedAttempts: 0, lockedUntil: null };
	entry.failedAttempts += 1;

	if (entry.failedAttempts >= maxAttempts) {
		entry.lockedUntil = now + lockoutMinutes * 60_000;
	}

	state.set(chatId, entry);
	return checkLockout(chatId, now);
}

export function recordSuccessfulAttempt(chatId: number): void {
	state.delete(chatId);
}

/** Só para testes — limpa todo o estado de bloqueio entre casos de teste. */
export function resetLockoutState(): void {
	state.clear();
}
