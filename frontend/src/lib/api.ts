import type { App } from "@agent-money-boilerplate/backend/src/server";
import { treaty } from "@elysiajs/eden";

// Mesma origem do frontend (proxiada pra API — ver frontend/server.ts e
// vite.config.ts), não a URL pública da API diretamente: o cookie de sessão
// pertence ao domínio do frontend (ver auth-client.ts), então uma chamada
// cross-site direta pra API não o enviaria. `window` não existe durante SSR,
// mas esse client só é usado dentro de componentes React (client-side).
const API_URL =
	typeof window !== "undefined" ? window.location.origin : (import.meta.env.VITE_API_URL ?? "http://localhost:4000");

export const api = treaty<App>(API_URL, {
	fetch: { credentials: "include" },
});
