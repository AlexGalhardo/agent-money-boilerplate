/** Accepts a comma or a dot as the decimal separator (e.g. "49,90" or "49.90"). */
export function parseAmountToCents(text: string): number | null {
	const normalized = text.trim().replace(",", ".");
	const value = Number.parseFloat(normalized);
	if (Number.isNaN(value) || value <= 0) {
		return null;
	}
	return Math.round(value * 100);
}
