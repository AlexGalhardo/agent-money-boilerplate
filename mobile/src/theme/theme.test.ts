import palette from "./palette";

// The palette feeds both NativeWind classes (tailwind.config.js) and raw
// style props; a malformed value would silently render transparent.
describe("palette", () => {
	it("defines every token as a 6-digit hex color", () => {
		for (const [token, value] of Object.entries(palette)) {
			expect({ token, value }).toEqual({ token, value: expect.stringMatching(/^#[0-9A-F]{6}$/i) });
		}
	});

	it("is wired into the Tailwind theme", () => {
		const config = require("../../tailwind.config.js");
		expect(config.theme.extend.colors).toBe(palette);
	});
});
