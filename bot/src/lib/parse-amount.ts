/** Aceita vírgula ou ponto como separador decimal (ex: "49,90" ou "49.90"). */
export function parseAmountToCents(text: string): number | null {
	const normalized = text.trim().replace(",", ".");
	const value = Number.parseFloat(normalized);
	if (Number.isNaN(value) || value <= 0) {
		return null;
	}
	return Math.round(value * 100);
}
