export class InvalidDateRangeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidDateRangeError";
	}
}

export type DateRange = { from: Date; to: Date };

const BRAZILIAN_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const MONTH_YEAR_PATTERN = /^(\d{2})\/(\d{4})$/;
const YEAR_PATTERN = /^(\d{4})$/;

function startOfDayUTC(year: number, month: number, day: number): Date {
	return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

function endOfDayUTC(year: number, month: number, day: number): Date {
	return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
}

function parseBrazilianDate(value: string): { year: number; month: number; day: number } {
	const match = value.trim().match(BRAZILIAN_DATE_PATTERN);
	if (!match) {
		throw new InvalidDateRangeError(`Data inválida "${value}", use o formato dd/mm/aaaa`);
	}

	const [, ddStr, mmStr, yyyyStr] = match;
	const day = Number(ddStr);
	const month = Number(mmStr);
	const year = Number(yyyyStr);

	const roundTrip = new Date(Date.UTC(year, month - 1, day));
	const isValid =
		roundTrip.getUTCFullYear() === year && roundTrip.getUTCMonth() === month - 1 && roundTrip.getUTCDate() === day;

	if (!isValid) {
		throw new InvalidDateRangeError(`Data inválida "${value}"`);
	}

	return { year, month, day };
}

export function lastNDays(days: number, now: Date = new Date()): DateRange {
	const to = endOfDayUTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	const start = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
	const from = startOfDayUTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
	return { from, to };
}

export function lastWeek(now: Date = new Date()): DateRange {
	return lastNDays(7, now);
}

export function last30Days(now: Date = new Date()): DateRange {
	return lastNDays(30, now);
}

export function yearRange(value: string): DateRange {
	const match = value.trim().match(YEAR_PATTERN);
	if (!match) {
		throw new InvalidDateRangeError(`Ano inválido "${value}", use o formato aaaa`);
	}
	const year = Number(match[1]);

	return { from: startOfDayUTC(year, 0, 1), to: endOfDayUTC(year, 11, 31) };
}

export function monthRange(value: string): DateRange {
	const match = value.trim().match(MONTH_YEAR_PATTERN);
	if (!match) {
		throw new InvalidDateRangeError(`Mês inválido "${value}", use o formato mm/aaaa`);
	}

	const month = Number(match[1]);
	const year = Number(match[2]);

	if (month < 1 || month > 12) {
		throw new InvalidDateRangeError(`Mês inválido "${value}", o mês deve estar entre 01 e 12`);
	}

	const from = startOfDayUTC(year, month - 1, 1);
	// Day 0 of the next month, in UTC, is the last day of the requested month.
	const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
	const to = endOfDayUTC(year, month - 1, lastDay);

	return { from, to };
}

export function customRange(fromValue: string, toValue: string): DateRange {
	const start = parseBrazilianDate(fromValue);
	const end = parseBrazilianDate(toValue);

	const from = startOfDayUTC(start.year, start.month - 1, start.day);
	const to = endOfDayUTC(end.year, end.month - 1, end.day);

	if (from.getTime() > to.getTime()) {
		throw new InvalidDateRangeError("A data inicial não pode ser depois da data final");
	}

	return { from, to };
}
