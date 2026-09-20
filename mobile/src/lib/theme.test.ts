import * as SecureStore from "expo-secure-store";
import { loadStoredThemePreference } from "./theme";

describe("loadStoredThemePreference", () => {
	afterEach(async () => {
		await SecureStore.deleteItemAsync("theme-preference");
	});

	it("defaults to system when nothing was ever stored", async () => {
		expect(await loadStoredThemePreference()).toBe("system");
	});

	it("defaults to system when the stored value isn't a valid preference", async () => {
		await SecureStore.setItemAsync("theme-preference", "not-a-theme");
		expect(await loadStoredThemePreference()).toBe("system");
	});

	it("round-trips a previously stored preference", async () => {
		await SecureStore.setItemAsync("theme-preference", "dark");
		expect(await loadStoredThemePreference()).toBe("dark");

		await SecureStore.setItemAsync("theme-preference", "light");
		expect(await loadStoredThemePreference()).toBe("light");
	});
});
