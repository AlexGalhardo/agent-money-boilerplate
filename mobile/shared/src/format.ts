import type { Currency } from "./subscriptions";

/**
 * Currency formatting without `Intl` (React Native's Hermes ships a limited ICU
 * on some setups). Integer cents in, localized string out.
 */
export function formatMoney(cents: number, currency: Currency = "BRL"): string {
	const negative = cents < 0;
	const abs = Math.abs(Math.trunc(cents));
	const whole = Math.floor(abs / 100).toString();
	const frac = (abs % 100).toString().padStart(2, "0");

	if (currency === "USD") {
		const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return `${negative ? "-" : ""}$${grouped}.${frac}`;
	}
	const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	return `${negative ? "-" : ""}R$ ${grouped},${frac}`;
}

export function formatDateBR(iso: string): string {
	const [y, m, d] = iso.slice(0, 10).split("-");
	if (!y || !m || !d) return iso;
	return `${d}/${m}/${y}`;
}
