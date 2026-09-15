import type { App } from "@elysia-galhardo-finances/api/src/server";
import { treaty } from "@elysiajs/eden";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const api = treaty<App>(API_URL, {
	fetch: { credentials: "include" },
});
