import { errorResponse } from "@op/shared";

import { apiBaseUrl } from "@/config/env";
import { clearTokens, loadTokens, saveTokens, type Tokens } from "./tokens";

export class ApiError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string,
		public fields?: Record<string, string>,
	) {
		super(message);
		this.name = "ApiError";
	}
}

let memoryTokens: Tokens | null = null;
let refreshInFlight: Promise<Tokens | null> | null = null;

/** Called by the auth layer after login/refresh so requests don't hit SecureStore each time. */
export function setSessionTokens(tokens: Tokens | null): void {
	memoryTokens = tokens;
}

async function currentTokens(): Promise<Tokens | null> {
	if (memoryTokens) return memoryTokens;
	memoryTokens = await loadTokens();
	return memoryTokens;
}

type Options = {
	method?: string;
	body?: unknown;
	auth?: boolean;
	query?: Record<string, string | number | undefined>;
};

async function raw(path: string, opts: Options): Promise<Response> {
	const url = new URL(`${apiBaseUrl}${path}`);
	for (const [k, v] of Object.entries(opts.query ?? {})) {
		if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
	}

	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (opts.auth !== false) {
		const tokens = await currentTokens();
		if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;
	}

	return fetch(url.toString(), {
		method: opts.method ?? "GET",
		headers,
		body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
	});
}

async function refresh(): Promise<Tokens | null> {
	const tokens = await currentTokens();
	if (!tokens) return null;

	refreshInFlight ??= (async () => {
		const res = await fetch(`${apiBaseUrl}/auth/refresh`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ refreshToken: tokens.refreshToken }),
		});
		if (!res.ok) {
			await clearTokens();
			setSessionTokens(null);
			return null;
		}
		const data = (await res.json()) as { tokens: Tokens };
		await saveTokens(data.tokens);
		setSessionTokens(data.tokens);
		return data.tokens;
	})().finally(() => {
		refreshInFlight = null;
	});

	return refreshInFlight;
}

async function toError(res: Response): Promise<ApiError> {
	const parsed = errorResponse.safeParse(await res.json().catch(() => null));
	if (parsed.success) {
		const e = parsed.data.error;
		return new ApiError(res.status, e.code, e.message, e.fields);
	}
	return new ApiError(res.status, "http_error", `Erro ${res.status}`);
}

export async function request<T>(path: string, opts: Options = {}): Promise<T> {
	let res = await raw(path, opts);

	if (res.status === 401 && opts.auth !== false) {
		const refreshed = await refresh();
		if (refreshed) res = await raw(path, opts);
	}

	if (!res.ok) throw await toError(res);
	if (res.status === 204) return undefined as T;
	return (await res.json()) as T;
}

export const apiClient = {
	get: <T>(path: string, query?: Options["query"]) => request<T>(path, { method: "GET", query }),
	post: <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: "POST", body, auth }),
	put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
	patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
	del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
