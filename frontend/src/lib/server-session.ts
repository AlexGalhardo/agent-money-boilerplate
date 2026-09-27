import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type ServerSession = {
	session: { id: string; userId: string; expiresAt: string };
	user: { id: string; name: string; email: string; twoFactorEnabled?: boolean | null };
} | null;

/**
 * Frontend and API run on separate servers, so during SSR (direct URL
 * navigation) the browser's `authClient.getSession()` can't see the session
 * cookie — the incoming request's `Cookie` header is forwarded to the API's
 * session endpoint instead.
 */
export const getServerSession = createServerFn({ method: "GET" }).handler(async (): Promise<ServerSession> => {
	const request = getRequest();
	const cookie = request.headers.get("cookie");

	const response = await fetch(`${API_URL}/auth/get-session`, {
		headers: cookie ? { cookie } : {},
	});

	if (!response.ok) return null;
	return (await response.json()) as ServerSession;
});

export type ServerPlan = { planStatus: string; planExpiresAt: string | null } | null;

/** Same cookie forwarding as `getServerSession`, for the plan fields
 * (not native to better-auth) exposed by `/users/me`. */
export const getServerPlan = createServerFn({ method: "GET" }).handler(async (): Promise<ServerPlan> => {
	const request = getRequest();
	const cookie = request.headers.get("cookie");

	const response = await fetch(`${API_URL}/users/me`, {
		headers: cookie ? { cookie } : {},
	});

	if (!response.ok) return null;
	const data = (await response.json()) as { user?: { planStatus: string; planExpiresAt: string | null } };
	return data.user ? { planStatus: data.user.planStatus, planExpiresAt: data.user.planExpiresAt } : null;
});
