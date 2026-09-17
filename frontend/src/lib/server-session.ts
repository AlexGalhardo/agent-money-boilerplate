import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type ServerSession = {
	session: { id: string; userId: string; expiresAt: string };
	user: { id: string; name: string; email: string; twoFactorEnabled?: boolean | null };
} | null;

/**
 * O frontend e a API rodam em servidores separados, então durante SSR
 * (navegação direta por URL) o `authClient.getSession()` do browser não
 * tem acesso ao cookie de sessão — é preciso repassar o header `Cookie`
 * da requisição recebida para o endpoint de sessão da API.
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

/** Mesma necessidade de repasse de cookie de `getServerSession`, mas pros
 * campos de plano (não nativos do better-auth) expostos em `/users/me`. */
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
