// Web build stub for `expo-sqlite`. The web target runs in `remote` data mode
// (EXPO_PUBLIC_DATA_MODE=remote), where the on-device database is never used;
// this keeps the native SQLite module out of the web bundle. If something does
// reach for it on web, fail loudly instead of silently returning bad data.
function unavailable() {
	throw new Error(
		"expo-sqlite is not available on web. Run the app with " +
			"EXPO_PUBLIC_DATA_MODE=remote (the web build already does).",
	);
}

export function openDatabaseAsync() {
	return Promise.reject(new Error("expo-sqlite não está disponível no modo web (use o modo remoto)."));
}

export function openDatabaseSync() {
	unavailable();
}

export default { openDatabaseAsync, openDatabaseSync };
