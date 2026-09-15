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

	const response = await fetch(`${API_URL}/api/auth/get-session`, {
		headers: cookie ? { cookie } : {},
	});

	if (!response.ok) return null;
	return (await response.json()) as ServerSession;
});
