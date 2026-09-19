export const MIN_AMOUNT_CENTS = 1;
export const MAX_AMOUNT_CENTS = 99999999;

export function formatBRL(cents: number): string {
	const sign = cents < 0 ? "-" : "";
	const abs = Math.abs(Math.trunc(cents));
	const reais = Math.floor(abs / 100).toString();
	const centavos = (abs % 100).toString().padStart(2, "0");
	const grouped = reais.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	return `${sign}R$ ${grouped},${centavos}`;
}

export function centsToBRDigits(cents: number): string {
	const abs = Math.abs(Math.trunc(cents));
	const reais = Math.floor(abs / 100).toString();
	const centavos = (abs % 100).toString().padStart(2, "0");
	const grouped = reais.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	return `${grouped},${centavos}`;
}

export function maskBRLFromDigits(raw: string): { cents: number; display: string } {
	const digits = raw.replace(/\D/g, "").slice(0, 8);
	const cents = digits ? Number(digits) : 0;
	return { cents, display: digits ? centsToBRDigits(cents) : "" };
}

export function parseBRLToCents(input: string): number | null {
	const cleaned = input.trim().replace(/\s/g, "").replace(/^R\$/i, "");
	if (!cleaned) return null;

	let normalized = cleaned;
	if (cleaned.includes(",")) {
		normalized = cleaned.replace(/\./g, "").replace(",", ".");
	}

	const value = Number(normalized);
	if (!Number.isFinite(value) || value < 0) return null;
	return Math.round(value * 100);
}

export function centsToInput(cents: number): string {
	return (cents / 100).toFixed(2).replace(".", ",");
}

export function todayISO(): string {
	const now = new Date();
	const y = now.getFullYear();
	const m = (now.getMonth() + 1).toString().padStart(2, "0");
	const d = now.getDate().toString().padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export function isoToBR(iso: string): string {
	const [y, m, d] = iso.slice(0, 10).split("-");
	if (!y || !m || !d) return iso;
	return `${d}/${m}/${y}`;
}

export function brToISO(input: string): string | null {
	const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (!match) return null;
	const [, d, m, y] = match;
	const dt = new Date(Number(y), Number(m) - 1, Number(d));
	if (dt.getFullYear() !== Number(y) || dt.getMonth() !== Number(m) - 1 || dt.getDate() !== Number(d)) {
		return null;
	}
	return `${y}-${m}-${d}`;
}

export function dateToISO(date: Date): string {
	const y = date.getFullYear();
	const m = (date.getMonth() + 1).toString().padStart(2, "0");
	const d = date.getDate().toString().padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export function isoToDate(iso: string): Date {
	const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
	if (!y || !m || !d) return new Date();
	return new Date(y, m - 1, d);
}
