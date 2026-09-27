import type { App } from "@agent-money-boilerplate/backend/src/server";
import { treaty } from "@elysiajs/eden";
import { Platform } from "react-native";
import { env } from "../config/env";
import { authClient } from "./auth-client";

// Eden knows nothing about the session cookie stored by @better-auth/expo
// (see auth-client.ts). React Native has no browser cookie jar, so on native
// every call re-attaches the cookie by hand — a custom `fetcher` is treaty's
// only extension point for that. On web the browser forbids setting a
// `Cookie` header and owns the cookie jar, so it just needs `credentials`.
async function fetchWithSession(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	if (Platform.OS === "web") {
		return fetch(input, { ...init, credentials: "include" });
	}

	const cookie = await authClient.getCookie();
	return fetch(input, {
		...init,
		headers: { ...init?.headers, ...(cookie ? { Cookie: cookie } : {}) },
	});
}

export const api = treaty<App>(env.apiUrl, {
	// lib.dom's `typeof fetch` requires the static `preconnect` member
	// (Chrome-only); Eden never calls it, the cast only satisfies the type.
	fetcher: fetchWithSession as typeof fetch,
});
