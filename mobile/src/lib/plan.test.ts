import { planRemainingLabel } from "./plan";

const DAY = 24 * 60 * 60 * 1000;

describe("planRemainingLabel", () => {
	it("counts days for short plans", () => {
		const planExpiresAt = new Date(Date.now() + 1.5 * DAY).toISOString();
		expect(planRemainingLabel({ planStatus: "active", planExpiresAt })).toBe("2 dias restantes");
	});

	it("shows the end date for long plans", () => {
		expect(planRemainingLabel({ planStatus: "active", planExpiresAt: "2099-12-31T12:00:00.000Z" })).toMatch(
			/^até \d{2}\/\d{2}\/2099$/,
		);
	});

	it("returns null without an active plan", () => {
		expect(planRemainingLabel({ planStatus: "inactive", planExpiresAt: null })).toBeNull();
	});
});
