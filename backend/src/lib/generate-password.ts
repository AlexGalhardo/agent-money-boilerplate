import { randomInt } from "node:crypto";

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+";
const ALL_CHARS = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS;

/** Cryptographically random password with at least one character of each
 * class (lower, upper, digit, symbol) — the auto-generated password of
 * Google-only accounts (see auth.ts). */
export function generateStrongPassword(length = 32): string {
	const required = [LOWERCASE, UPPERCASE, DIGITS, SYMBOLS].map((set) => set[randomInt(set.length)]);
	const rest = Array.from({ length: length - required.length }, () => ALL_CHARS[randomInt(ALL_CHARS.length)]);

	const chars = [...required, ...rest];
	for (let i = chars.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[chars[i], chars[j]] = [chars[j], chars[i]];
	}

	return chars.join("");
}
