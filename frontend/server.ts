// Production entrypoint (Docker, PM2/VPS, Railway). `dist/server/server.js`
// (from `vite build`) only exports TanStack Start's SSR handler — it doesn't
// serve `dist/client` (hashed JS/CSS in `assets/`, and everything copied from
// `public/`), so running it directly serves unstyled HTML and 404s for
// favicon/robots. This wrapper serves any path with an extension from
// `dist/client`, proxies API paths, and hands everything else to SSR.
//
// The SSR bundle is imported through a path computed at runtime on purpose:
// `dist/` only exists after `bun run build`, and the pre-push hook runs
// `tsc --noEmit` before building — a static import would fail typecheck on a
// clean checkout (and even with `dist/` present, TS7016: Bun emits no .d.ts).
import { extname, join, normalize } from "node:path";
import { PROXIED_API_PATHS } from "./proxy-paths";

type SsrHandler = { fetch: (request: Request) => Promise<Response> };

const ssrEntryPath = join(import.meta.dir, "dist/server/server.js");
const { default: ssrHandler } = (await import(ssrEntryPath)) as { default: SsrHandler };

const clientDir = join(import.meta.dir, "dist/client");
const port = Number(process.env.PORT ?? 4001);
const backendUrl = process.env.VITE_API_URL ?? "http://localhost:4000";

// OWASP A05. 'unsafe-inline' for scripts is required by the inline theme
// script (__root.tsx) and TanStack Start's inline hydration payload; every
// other source is locked to this origin (API calls go through the proxy
// below) plus Google Fonts.
const CONTENT_SECURITY_POLICY = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline'",
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"font-src 'self' https://fonts.gstatic.com",
	"img-src 'self' data: blob:",
	"connect-src 'self'",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
	"Content-Security-Policy": CONTENT_SECURITY_POLICY,
	"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function withSecurityHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!headers.has(name)) headers.set(name, value);
	}
	return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function isProxiedApiPath(pathname: string): boolean {
	return PROXIED_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// Forwards to the API while keeping the response (Set-Cookie included) as if
// it came from the frontend itself — see proxy-paths.ts for why the session
// cookie depends on it. `fetch` already decompresses the upstream body, so
// the upstream `content-encoding`/`content-length` no longer apply.
async function proxyToBackend(request: Request): Promise<Response> {
	const { pathname, search } = new URL(request.url);
	const headers = new Headers(request.headers);
	headers.delete("host");
	headers.delete("content-length");

	const response = await fetch(`${backendUrl}${pathname}${search}`, {
		method: request.method,
		headers,
		body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
		// @ts-expect-error Bun needs `duplex` to forward a streaming request body
		duplex: "half",
		// Without this Bun follows the API's 3xx itself (better-auth's OAuth
		// callback, verify-email, reset-password redirects) and returns the
		// final response instead of the redirect, so the browser never navigates.
		redirect: "manual",
	});

	const responseHeaders = new Headers(response.headers);
	responseHeaders.delete("content-encoding");
	responseHeaders.delete("content-length");
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders,
	});
}

async function handle(request: Request): Promise<Response> {
	const { pathname } = new URL(request.url);
	if (isProxiedApiPath(pathname)) {
		return proxyToBackend(request);
	}
	if (extname(pathname)) {
		const relative = normalize(pathname.slice(1));
		if (!relative.startsWith("..")) {
			const file = Bun.file(join(clientDir, relative));
			if (await file.exists()) {
				return new Response(file);
			}
		}
	}
	return ssrHandler.fetch(request);
}

Bun.serve({
	port,
	async fetch(request) {
		return withSecurityHeaders(await handle(request));
	},
});

console.log(`🦊 Agent Money Boilerplate frontend listening on http://localhost:${port}`);
