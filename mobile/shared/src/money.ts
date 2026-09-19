import Big from "big.js";

import type { TxType } from "./categories";

/**
 * All money math goes through big.js so results never depend on IEEE-754
 * rounding. Values are integer cents at the boundaries; Big is used only for
 * intermediate arithmetic (interest, currency conversion, splitting).
 *
 * Rounding mode is fixed to half-up (`Big.roundHalfUp`) — the convention users
 * expect for currency ("round .5 away from zero" on the magnitude).
 */

// RoundHalfUp = 1. Set once for the module.
Big.RM = 1 as Big.RoundingMode;
Big.DP = 20;

export type MoneyLine = { type: TxType; amountCents: number };

export type Balance = { income: number; expense: number; balance: number };

/** Sum a set of income/expense lines into a period balance, all in cents. */
export function summarize(lines: readonly MoneyLine[]): Balance {
	let income = new Big(0);
	let expense = new Big(0);
	for (const line of lines) {
		const amt = new Big(line.amountCents);
		if (line.type === "income") income = income.plus(amt);
		else expense = expense.plus(amt);
	}
	return {
		income: Number(income),
		expense: Number(expense),
		balance: Number(income.minus(expense)),
	};
}

/** Round a Big value to whole cents (half-up on magnitude). */
export function toCents(value: Big.Big | number | string): number {
	const b = value instanceof Big ? value : new Big(value);
	// round(0, half-up) on the magnitude, then restore sign
	const rounded = b.abs().round(0, 1);
	return Number(b.lt(0) ? rounded.times(-1) : rounded);
}

/**
 * Convert an integer-cent amount from one currency to another using a decimal
 * rate (target units per 1 source unit). Result is whole cents in the target
 * currency.
 */
export function convertCents(amountCents: number, rate: number | string): number {
	return toCents(new Big(amountCents).times(new Big(rate)));
}

/**
 * Simple interest: principal and result in cents, `annualRate` as a decimal
 * fraction (0.12 = 12% a year), `days` on a 365-day year.
 */
export function simpleInterestCents(principalCents: number, annualRate: number | string, days: number): number {
	const interest = new Big(principalCents).times(new Big(annualRate)).times(new Big(days)).div(365);
	return toCents(interest);
}

/**
 * Compound interest over `periods` whole compounding periods at `ratePerPeriod`
 * (decimal fraction). Returns the accrued interest in cents (not principal +
 * interest).
 */
export function compoundInterestCents(principalCents: number, ratePerPeriod: number | string, periods: number): number {
	if (periods < 0 || !Number.isInteger(periods)) {
		throw new Error("periods deve ser um inteiro não-negativo");
	}
	const growth = new Big(1).plus(new Big(ratePerPeriod)).pow(periods);
	const total = new Big(principalCents).times(growth);
	return toCents(total.minus(principalCents));
}

/**
 * Split an amount of cents into `parts` as evenly as possible, distributing the
 * leftover cents one-per-line to the first lines. The sum of the result always
 * equals `amountCents` exactly.
 */
export function allocateCents(amountCents: number, parts: number): number[] {
	if (parts <= 0 || !Number.isInteger(parts)) {
		throw new Error("parts deve ser um inteiro positivo");
	}
	const base = Math.trunc(amountCents / parts);
	const remainder = amountCents - base * parts;
	return Array.from({ length: parts }, (_, i) => (i < Math.abs(remainder) ? base + Math.sign(remainder) : base));
}
