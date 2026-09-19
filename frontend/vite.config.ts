import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { PROXIED_API_PATHS } from "./proxy-paths";

const BACKEND_URL = process.env.VITE_API_URL ?? "http://localhost:4000";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
	server: {
		// Espelha o proxy de produção (ver frontend/server.ts) pro dev server
		// do Vite, pro cookie de sessão se comportar igual nos dois ambientes.
		// Chave começando com "^" vira RegExp no Vite — necessário pra casar só
		// `path` exato ou `path/...`, igual ao matcher de produção: sem isso,
		// "/telegram" (prefixo string simples) também proxiaria por engano
		// páginas como "/telegram-vincular" pra API.
		proxy: Object.fromEntries(
			PROXIED_API_PATHS.map((path) => [`^${path}(/|$)`, { target: BACKEND_URL, changeOrigin: true }]),
		),
	},
	build: {
		rollupOptions: {
			output: {
				// O build de produção roda o client e o SSR como duas builds
				// separadas (ver TanStack Start), e cada uma reprocessa o CSS do
				// Tailwind de forma independente — a ordem de descoberta das
				// classes não é 100% determinística entre as duas, então o hash
				// de conteúdo do CSS às vezes sai diferente entre elas. O bundle
				// de SSR referencia o nome que ELE calculou, não o que o client
				// realmente gerou, e esse descompasso faz o <link rel="stylesheet">
				// apontar pra um arquivo que não existe (reproduzido em builds
				// dentro de container Docker; nem sempre em builds locais).
				// Nome fixo (sem hash) só pro CSS elimina esse descompasso.
				assetFileNames: (asset) => {
					const name = asset.name ?? asset.names?.[0] ?? "";
					return name.endsWith(".css") ? "assets/[name][extname]" : "assets/[name]-[hash][extname]";
				},
			},
		},
	},
});

export default config;
