/* eslint-disable no-undef */
// @testing-library/react-native v13+ registers its matchers automatically.

jest.mock("expo-secure-store", () => {
	const store = new Map();
	return {
		getItemAsync: jest.fn(async (k) => store.get(k) ?? null),
		setItemAsync: jest.fn(async (k, v) => void store.set(k, v)),
		deleteItemAsync: jest.fn(async (k) => void store.delete(k)),
	};
});

jest.mock("expo-web-browser", () => ({
	openBrowserAsync: jest.fn(async () => ({ type: "opened" })),
	maybeCompleteAuthSession: jest.fn(),
}));

// Reanimated 4's bundled mock drags in react-native-worklets, which explodes
// under Jest. Swap the animated primitives for plain RN views (styles/entering
// props are irrelevant to behavioural assertions) and the layout presets for
// chainable no-ops.
jest.mock("react-native-reanimated", () => {
	const RN = require("react-native");
	const preset = new Proxy(() => {}, {
		get: () => preset,
		apply: () => preset,
	});
	return {
		__esModule: true,
		default: { View: RN.View, Text: RN.Text, ScrollView: RN.ScrollView },
		FadeIn: preset,
		FadeOut: preset,
		FadeInDown: preset,
		FadeInUp: preset,
		LinearTransition: preset,
	};
});

jest.spyOn(console, "warn").mockImplementation(() => {});
