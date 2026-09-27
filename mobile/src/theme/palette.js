// Single source of truth for the app's colors. CommonJS on purpose:
// tailwind.config.js (run by Node, no TS loader) requires it to generate the
// NativeWind classes, and src/theme/index.ts re-exports it typed for the
// few props that need a raw value (icon colors, ActivityIndicator, pickers).
// Dark-only by design — there is no light variant.
module.exports = {
	canvas: "#09090B",
	surface: "#131316",
	raised: "#1C1C21",
	line: "#26262C",
	fg: "#FAFAFA",
	muted: "#A1A1AA",
	subtle: "#71717A",
	primary: "#FAFAFA",
	"on-primary": "#09090B",
	brand: "#22C55E",
	income: "#34D399",
	expense: "#F87171",
	warning: "#FBBF24",
	danger: "#EF4444",
};
