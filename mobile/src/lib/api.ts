import type { App } from "@agent-money-boilerplate/backend/src/server";
import { treaty } from "@elysiajs/eden";
import { env } from "../config/env";
import { authClient } from "./auth-client";

// O cliente Eden não sabe nada sobre o cookie de sessão guardado pelo
// @better-auth/expo (ver auth-client.ts) — sem cookie jar de navegador no
// React Native, cada chamada precisa reanexar o cookie manualmente. Um
// `fetcher` customizado é o único ponto de extensão do treaty pra isso
// (ver node_modules/@elysiajs/eden/dist/treaty/types.d.ts: `fetcher?: typeof fetch`).
async function fetchWithSessionCookie(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	const cookie = await authClient.getCookie();
	return fetch(input, {
		...init,
		headers: { ...init?.headers, ...(cookie ? { Cookie: cookie } : {}) },
	});
}

export const api = treaty<App>(env.apiUrl, {
	// `typeof fetch` no lib.dom.d.ts exige o membro estático `preconnect`
	// (Chrome-only, irrelevante em React Native) — o cast é só pra satisfazer
	// esse detalhe de tipagem, o eden nunca chama `.preconnect` no fetcher.
	fetcher: fetchWithSessionCookie as typeof fetch,
});
