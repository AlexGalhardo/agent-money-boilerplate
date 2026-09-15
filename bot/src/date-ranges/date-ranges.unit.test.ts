import { describe, expect, it } from "bun:test";
import {
	customRange,
	InvalidDateRangeError,
	last30Days,
	lastNDays,
	lastWeek,
	monthRange,
	yearRange,
} from "./date-ranges";

describe("lastNDays / lastWeek / last30Days", () => {
	it("covers exactly N days ending today (inclusive)", () => {
		const now = new Date("2026-08-15T10:30:00.000Z");
		const { from, to } = lastNDays(7, now);

		expect(from.toISOString()).toBe("2026-08-09T00:00:00.000Z");
		expect(to.toISOString()).toBe("2026-08-15T23:59:59.999Z");
	});

	it("lastWeek() is the same as lastNDays(7)", () => {
		const now = new Date("2026-08-15T10:30:00.000Z");
		expect(lastWeek(now)).toEqual(lastNDays(7, now));
	});

	it("last30Days() is the same as lastNDays(30)", () => {
		const now = new Date("2026-08-15T10:30:00.000Z");
		expect(last30Days(now)).toEqual(lastNDays(30, now));
	});

	it("handles crossing a month boundary", () => {
		const now = new Date("2026-09-03T00:00:00.000Z");
		const { from } = lastNDays(7, now);

		expect(from.toISOString()).toBe("2026-08-28T00:00:00.000Z");
	});

	it("handles crossing a year boundary", () => {
		const now = new Date("2027-01-02T00:00:00.000Z");
		const { from } = lastNDays(7, now);

		expect(from.toISOString()).toBe("2026-12-27T00:00:00.000Z");
	});
});

describe("yearRange", () => {
	it("covers the full calendar year", () => {
		const { from, to } = yearRange("2026");

		expect(from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
		expect(to.toISOString()).toBe("2026-12-31T23:59:59.999Z");
	});

	it("throws InvalidDateRangeError for a malformed year", () => {
		expect(() => yearRange("26")).toThrow(InvalidDateRangeError);
	});
});

describe("monthRange", () => {
	it("covers a 31-day month fully", () => {
		const { from, to } = monthRange("08/2026");

		expect(from.toISOString()).toBe("2026-08-01T00:00:00.000Z");
		expect(to.toISOString()).toBe("2026-08-31T23:59:59.999Z");
	});

	it("covers February in a leap year fully", () => {
		const { from, to } = monthRange("02/2028");

		expect(from.toISOString()).toBe("2028-02-01T00:00:00.000Z");
		expect(to.toISOString()).toBe("2028-02-29T23:59:59.999Z");
	});

	it("covers February in a non-leap year fully", () => {
		const { to } = monthRange("02/2026");

		expect(to.toISOString()).toBe("2026-02-28T23:59:59.999Z");
	});

	it("throws InvalidDateRangeError for an out-of-range month", () => {
		expect(() => monthRange("13/2026")).toThrow(InvalidDateRangeError);
	});

	it("throws InvalidDateRangeError for a malformed value", () => {
		expect(() => monthRange("2026-08")).toThrow(InvalidDateRangeError);
	});
});

describe("customRange", () => {
	it("parses dd/mm/aaaa on both ends", () => {
		const { from, to } = customRange("01/08/2026", "15/08/2026");

		expect(from.toISOString()).toBe("2026-08-01T00:00:00.000Z");
		expect(to.toISOString()).toBe("2026-08-15T23:59:59.999Z");
	});

	it("throws InvalidDateRangeError when from is after to", () => {
		expect(() => customRange("15/08/2026", "01/08/2026")).toThrow(InvalidDateRangeError);
	});

	it("throws InvalidDateRangeError for a non-existent date like 31/02", () => {
		expect(() => customRange("31/02/2026", "01/03/2026")).toThrow(InvalidDateRangeError);
	});

	it("throws InvalidDateRangeError for a malformed date", () => {
		expect(() => customRange("2026-08-01", "2026-08-15")).toThrow(InvalidDateRangeError);
	});
});
