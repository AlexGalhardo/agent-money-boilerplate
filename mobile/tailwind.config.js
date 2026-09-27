const palette = require("./src/theme/palette");

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}"],
	presets: [require("nativewind/preset")],
	theme: {
		extend: {
			colors: palette,
			fontSize: {
				display: ["34px", { lineHeight: "40px", fontWeight: "700" }],
				title: ["22px", { lineHeight: "28px", fontWeight: "600" }],
				headline: ["17px", { lineHeight: "22px", fontWeight: "600" }],
				body: ["16px", { lineHeight: "22px" }],
				subhead: ["15px", { lineHeight: "20px" }],
				footnote: ["13px", { lineHeight: "18px" }],
				caption: ["12px", { lineHeight: "16px" }],
			},
			borderRadius: {
				control: "12px",
				card: "16px",
			},
		},
	},
	plugins: [],
};
