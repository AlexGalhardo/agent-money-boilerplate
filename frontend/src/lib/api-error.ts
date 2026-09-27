/**
 * Extracts the `{ message }` the backend sends on errors (see backend/src/app.ts)
 * from an Eden treaty error, falling back to a caller-provided message.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
	if (error && typeof error === "object" && "value" in error) {
		const value = (error as { value?: unknown }).value;
		if (value && typeof value === "object" && "message" in value) {
			return String((value as { message: unknown }).message);
		}
	}
	return fallback;
}
