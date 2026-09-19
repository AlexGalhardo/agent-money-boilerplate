import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "op.accessToken";
const REFRESH_KEY = "op.refreshToken";

export type Tokens = { accessToken: string; refreshToken: string };

export async function loadTokens(): Promise<Tokens | null> {
	const [accessToken, refreshToken] = await Promise.all([
		SecureStore.getItemAsync(ACCESS_KEY),
		SecureStore.getItemAsync(REFRESH_KEY),
	]);
	if (!accessToken || !refreshToken) return null;
	return { accessToken, refreshToken };
}

export async function saveTokens(tokens: Tokens): Promise<void> {
	await Promise.all([
		SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
		SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
	]);
}

export async function clearTokens(): Promise<void> {
	await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]);
}
