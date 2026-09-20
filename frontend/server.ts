// Entrypoint de produção (Docker + PM2/VPS, ver frontend/Dockerfile e
// ecosystem.config.js). `dist/server/server.js` (gerado por `vite build`)
// exporta só o handler de SSR do TanStack Start — ele não serve os arquivos
// estáticos de `dist/client` (JS/CSS com hash em `assets/`, e qualquer coisa
// copiada de `public/` — favicon.svg, robots.txt etc. — direto na raiz),
// então rodá-lo direto resulta em toda a página vindo sem estilo/JS (tudo
// cai no fallback de SSR, que devolve HTML puro) e nesses arquivos de
// `public/` dando 404. Este wrapper serve qualquer caminho com extensão a
// partir de `dist/client` antes de delegar o resto para o handler de SSR.
//
// O import do bundle de SSR usa um caminho calculado em runtime (não um
// literal) de propósito: `dist/` só existe depois de `bun run build`, e o
// hook de pre-push roda `tsc --noEmit` antes do build — um `import` estático
// pro caminho faria o typecheck falhar ("Cannot find module") num checkout
// limpo, e um literal, mesmo com `dist/` presente, dispara TS7016 (Bun não
// gera .d.ts pro build). Caminho dinâmico faz o TS tratar o import como
// `unknown` em vez de tentar resolver o arquivo.
import { extname, join, normalize } from "node:path";
import { PROXIED_API_PATHS } from "./proxy-paths";

type SsrHandler = { fetch: (request: Request) => Promise<Response> };

const ssrEntryPath = join(import.meta.dir, "dist/server/server.js");
const { default: ssrHandler } = (await import(ssrEntryPath)) as { default: SsrHandler };

const clientDir = join(import.meta.dir, "dist/client");
const port = Number(process.env.PORT ?? 4001);
const backendUrl = process.env.VITE_API_URL ?? "http://localhost:4000";

function isProxiedApiPath(pathname: string): boolean {
	return PROXIED_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// Encaminha pra API mantendo a resposta (Set-Cookie incluso) como se viesse
// do próprio frontend — ver proxy-paths.ts pro porquê disso ser necessário
// pro cookie de sessão funcionar (frontend e API são domínios diferentes no
// Railway). `fetch` já descomprime o corpo da resposta da API, então
// `content-encoding`/`content-length` do upstream não valem mais aqui.
async function proxyToBackend(request: Request): Promise<Response> {
	const { pathname, search } = new URL(request.url);
	const headers = new Headers(request.headers);
	headers.delete("host");
	headers.delete("content-length");

	const response = await fetch(`${backendUrl}${pathname}${search}`, {
		method: request.method,
		headers,
		body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
		// @ts-expect-error necessário no Bun para repassar um body em streaming
		duplex: "half",
		// Sem isso, o Bun segue 3xx da API sozinho (ex.: os redirects do
		// better-auth no callback do OAuth, verify-email, reset-password) e
		// devolve pro navegador a resposta final já resolvida, não o redirect
		// em si — quebrando qualquer fluxo que dependa do navegador navegar
		// pra URL do Location (ele nem muda de URL).
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

Bun.serve({
	port,
	async fetch(request) {
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
	},
});

console.log(`🦊 Agent Money Boilerplate frontend rodando em http://localhost:${port}`);
