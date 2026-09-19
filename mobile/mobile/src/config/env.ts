import { z } from "zod";

/**
 * Public runtime config. Only `EXPO_PUBLIC_`-prefixed vars reach the bundle;
 * they are inlined at build time. Validated once so the rest of the app can
 * assume a good shape.
 *
 * - `local`  → offline-first, local SQLite is the source of truth (no backend).
 * - `remote` → online-first against the deployed API via TanStack Query.
 */
const schema = z.object({
	dataMode: z.enum(["local", "remote"]).default("local"),
	apiUrl: z.string().url().default("http://localhost:3333"),
	apiVersion: z.string().default("v1"),
});

const parsed = schema.safeParse({
	dataMode: process.env.EXPO_PUBLIC_DATA_MODE,
	apiUrl: process.env.EXPO_PUBLIC_API_URL,
	apiVersion: process.env.EXPO_PUBLIC_API_VERSION,
});

if (!parsed.success) {
	throw new Error(
		`Config inválida (EXPO_PUBLIC_*): ${parsed.error.issues
			.map((i) => `${i.path.join(".")}: ${i.message}`)
			.join("; ")}`,
	);
}

export const env = parsed.data;
export const isRemote = env.dataMode === "remote";
export const apiBaseUrl = `${env.apiUrl.replace(/\/$/, "")}/${env.apiVersion}`;
