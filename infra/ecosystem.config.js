// Configuração do PM2 para deploy em VPS sem Docker (backend/server precisa
// ter sido compilado antes com `bun run build` em backend/ e frontend/).
module.exports = {
	apps: [
		{
			name: "elysia-backend",
			cwd: "./backend",
			script: "./server",
			interpreter: "none",
			env: { NODE_ENV: "production" },
			instances: 1,
			autorestart: true,
			max_memory_restart: "300M",
		},
		{
			name: "elysia-frontend",
			cwd: "./frontend",
			script: "server.ts",
			interpreter: "bun",
			// VITE_API_URL aqui é lido em runtime pelo proxy de /auth, /users,
			// /transactions etc. embutido em server.ts (ver
			// frontend/proxy-paths.ts) — diferente do valor usado em build time
			// (a URL pública, ver docs/deploy/vps.md), já que
			// backend e frontend rodam no mesmo host aqui.
			env: { NODE_ENV: "production", PORT: "4001", VITE_API_URL: "http://localhost:4000" },
			instances: 1,
			autorestart: true,
			max_memory_restart: "300M",
		},
	],
};
