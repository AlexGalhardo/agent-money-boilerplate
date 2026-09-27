// Serves `expo export --platform web` output as a SPA (unknown paths fall
// back to index.html) for the Playwright suite in e2e-web/.
import { join } from "node:path";

const root = join(import.meta.dir, "..", process.argv[2] ?? "dist-e2e");
const port = Number(process.argv[3] ?? 4301);

Bun.serve({
	port,
	async fetch(request) {
		const path = new URL(request.url).pathname;
		const file = Bun.file(join(root, path));
		if (path !== "/" && !path.includes("..") && (await file.exists())) return new Response(file);
		return new Response(Bun.file(join(root, "index.html")), { headers: { "content-type": "text/html" } });
	},
});

console.log(`serving ${root} on http://localhost:${port}`);
