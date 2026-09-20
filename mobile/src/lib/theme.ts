import * as SecureStore from "expo-secure-store";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme-preference";

function isThemePreference(value: string | null): value is ThemePreference {
	return value === "light" || value === "dark" || value === "system";
}

export async function loadStoredThemePreference(): Promise<ThemePreference> {
	const stored = await SecureStore.getItemAsync(STORAGE_KEY);
	return isThemePreference(stored) ? stored : "system";
}

async function storeThemePreference(preference: ThemePreference): Promise<void> {
	await SecureStore.setItemAsync(STORAGE_KEY, preference);
}

/**
 * Reads the user's saved light/dark/system preference once on mount and
 * applies it via NativeWind's setColorScheme (see tailwind.config.js's
 * darkMode: "class" - required for this call to do anything). Call this
 * once near the app root (src/app/_layout.tsx); every screen just uses
 * useAppColorScheme() below to read/toggle it afterwards.
 */
export function useApplyStoredTheme(): void {
	const { setColorScheme } = useColorScheme();

	// biome-ignore lint/correctness/useExhaustiveDependencies: setColorScheme is stable (from the nativewind hook), and this must only run once on mount.
	useEffect(() => {
		let cancelled = false;
		loadStoredThemePreference().then((preference) => {
			if (!cancelled) setColorScheme(preference);
		});
		return () => {
			cancelled = true;
		};
	}, []);
}

/**
 * The hook every screen/component uses to read the resolved scheme
 * ("light"/"dark", "system" already resolved to one of those by NativeWind)
 * and to change + persist the preference.
 */
export function useAppColorScheme(): {
	colorScheme: "light" | "dark";
	isDark: boolean;
	setTheme: (preference: ThemePreference) => void;
} {
	const { colorScheme, setColorScheme } = useColorScheme();

	const setTheme = useCallback(
		(preference: ThemePreference) => {
			// setColorScheme resolves "system" against the OS setting and updates
			// this hook's `colorScheme` synchronously - the SecureStore write can
			// safely happen in the background after that.
			setColorScheme(preference);
			void storeThemePreference(preference);
		},
		[setColorScheme],
	);

	return { colorScheme: colorScheme ?? "light", isDark: colorScheme === "dark", setTheme };
}
