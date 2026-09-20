/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}"],
	presets: [require("nativewind/preset")],
	// "class" (not the default "media") is required for NativeWind's
	// setColorScheme()/toggleColorScheme() to work at all - with "media" they
	// throw, since dark mode would only ever follow the OS setting. See
	// src/lib/theme.ts for the light/dark/system toggle this enables.
	darkMode: "class",
	theme: {
		extend: {},
	},
	plugins: [],
};
