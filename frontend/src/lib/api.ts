import type { App } from "@agent-money-boilerplate/backend/src/server";
import { treaty } from "@elysiajs/eden";

// Same origin as the frontend (proxied to the API — see frontend/server.ts and
// vite.config.ts), not the API's public URL: the session cookie belongs to
// the frontend domain (see auth-client.ts), so a direct cross-site call
// wouldn't carry it. `window` doesn't exist during SSR, but this client is
// only used inside React components (client-side).
const API_URL =
	typeof window !== "undefined" ? window.location.origin : (import.meta.env.VITE_API_URL ?? "http://localhost:4000");

export const api = treaty<App>(API_URL, {
	fetch: { credentials: "include" },
});
