import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { PROXIED_API_PATHS } from "./proxy-paths.ts";

const BACKEND_URL = process.env.VITE_API_URL ?? "http://localhost:4000";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
	// The dep scanner misses these (reached only through TanStack Start's
	// virtual entries and the lazily loaded auth client), so a cold dev server
	// discovered them mid-session and force-reloaded every open page — which
	// aborted in-flight navigations in the QA run (`net::ERR_ABORTED`).
	optimizeDeps: {
		include: [
			"@tanstack/router-core",
			"@tanstack/router-core/isServer",
			"@tanstack/router-core/ssr/client",
			"seroval",
			"@better-auth/core/env",
			"@better-auth/core/error",
			"@better-auth/core/utils/error-codes",
			"@better-auth/core/utils/string",
			"@better-auth/core/utils/url",
			"@better-fetch/fetch",
			"defu",
			"nanostores",
		],
	},
	server: {
		// Mirrors the production proxy (frontend/server.ts) in Vite's dev server
		// so the session cookie behaves the same in both. A key starting with "^"
		// becomes a RegExp in Vite — needed to match only `path`, `path/...` or
		// `path?...` like the production matcher: a plain prefix "/telegram" would
		// also proxy pages like "/telegram-vincular". Vite matches against
		// path+query, so without "|\\?" a call like "/transactions?page=1" fell
		// through to Vite's SPA fallback (404) and never reached the backend.
		proxy: Object.fromEntries(
			PROXIED_API_PATHS.map((path) => [`^${path}(/|$|\\?)`, { target: BACKEND_URL, changeOrigin: true }]),
		),
	},
	build: {
		rollupOptions: {
			output: {
				// The production build runs client and SSR as two separate builds, and
				// each processes Tailwind's CSS independently — class discovery order
				// isn't fully deterministic between them, so the CSS content hash can
				// differ. The SSR bundle references ITS hash, not the file the client
				// build emitted, and <link rel="stylesheet"> 404s (reproduced in Docker
				// builds). A fixed, hash-less name for CSS only removes the mismatch.
				assetFileNames: (asset) => {
					const name = asset.name ?? asset.names?.[0] ?? "";
					return name.endsWith(".css") ? "assets/[name][extname]" : "assets/[name]-[hash][extname]";
				},
			},
		},
	},
});

export default config;
