// Entrypoint de produção (Docker + PM2/VPS, ver frontend/Dockerfile e
// ecosystem.config.js). `dist/server/server.js` (gerado por `vite build`)
// exporta só o handler de SSR do TanStack Start — ele não serve os arquivos
// estáticos de `dist/client/assets` (JS/CSS com hash), então rodá-lo direto
// resulta em toda a página vindo sem estilo/JS (tudo cai no fallback de SSR,
// que devolve HTML puro). Este wrapper serve `/assets/*` a partir do disco
// antes de delegar o resto para o handler de SSR.
//
// O import do bundle de SSR usa um caminho calculado em runtime (não um
// literal) de propósito: `dist/` só existe depois de `bun run build`, e o
// hook de pre-push roda `tsc --noEmit` antes do build — um `import` estático
// pro caminho faria o typecheck falhar ("Cannot find module") num checkout
// limpo, e um literal, mesmo com `dist/` presente, dispara TS7016 (Bun não
// gera .d.ts pro build). Caminho dinâmico faz o TS tratar o import como
// `unknown` em vez de tentar resolver o arquivo.
import { extname, join, normalize } from "node:path";

type SsrHandler = { fetch: (request: Request) => Promise<Response> };

const ssrEntryPath = join(import.meta.dir, "dist/server/server.js");
const { default: ssrHandler } = (await import(ssrEntryPath)) as { default: SsrHandler };

const clientAssetsDir = join(import.meta.dir, "dist/client/assets");
const port = Number(process.env.PORT ?? 4001);

Bun.serve({
	port,
	async fetch(request) {
		const { pathname } = new URL(request.url);
		if (pathname.startsWith("/assets/")) {
			const relative = normalize(pathname.slice("/assets/".length));
			if (!relative.startsWith("..") && extname(relative)) {
				const file = Bun.file(join(clientAssetsDir, relative));
				if (await file.exists()) {
					return new Response(file);
				}
			}
		}
		return ssrHandler.fetch(request);
	},
});

console.log(`🦊 Elysia Finanças frontend rodando em http://localhost:${port}`);
