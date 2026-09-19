import { brToISO, formatBRL, isoToBR, maskBRLFromDigits, parseBRLToCents } from "./format";

describe("formatBRL", () => {
	it("formats cents as BRL with thousands separator", () => {
		expect(formatBRL(150000)).toBe("R$ 1.500,00");
		expect(formatBRL(50)).toBe("R$ 0,50");
		expect(formatBRL(0)).toBe("R$ 0,00");
	});

	it("formats negative values with a leading minus sign", () => {
		expect(formatBRL(-1050)).toBe("-R$ 10,50");
	});
});

describe("maskBRLFromDigits", () => {
	it("converts raw digit input into cents and a display string", () => {
		expect(maskBRLFromDigits("15000")).toEqual({ cents: 15000, display: "150,00" });
		expect(maskBRLFromDigits("")).toEqual({ cents: 0, display: "" });
	});

	it("strips non-digit characters", () => {
		expect(maskBRLFromDigits("R$ 1.500,00")).toEqual({ cents: 150000, display: "1.500,00" });
	});
});

describe("parseBRLToCents", () => {
	it("parses a BRL-formatted string into cents", () => {
		expect(parseBRLToCents("1.500,00")).toBe(150000);
		expect(parseBRLToCents("10,50")).toBe(1050);
	});

	it("returns null for invalid or negative input", () => {
		expect(parseBRLToCents("")).toBeNull();
		expect(parseBRLToCents("-10")).toBeNull();
	});
});

describe("isoToBR / brToISO", () => {
	it("round-trips a date between ISO and BR formats", () => {
		expect(isoToBR("2026-03-05")).toBe("05/03/2026");
		expect(brToISO("05/03/2026")).toBe("2026-03-05");
	});

	it("rejects an invalid BR date", () => {
		expect(brToISO("31/02/2026")).toBeNull();
	});
});
