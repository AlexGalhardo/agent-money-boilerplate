import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison for shared secrets (webhook/cron). Hashing
 * first gives both sides the same length, which `timingSafeEqual` requires,
 * without leaking the secret's length through an early return.
 */
export function secureCompare(received: string | null | undefined, expected: string): boolean {
	if (typeof received !== "string") return false;
	const digest = (value: string) => createHash("sha256").update(value).digest();
	return timingSafeEqual(digest(received), digest(expected));
}
