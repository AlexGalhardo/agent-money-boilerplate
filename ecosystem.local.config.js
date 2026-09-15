// PM2 para desenvolvimento local sem Docker — roda os 3 workspaces em modo
// watch (`bun run dev` de cada um). Diferente de ecosystem.config.js
// (deploy em VPS), que espera os builds já compilados (api/server binário,
// frontend/server.ts + frontend/dist) e não serve para iterar localmente.
// Usado por setup-unix-using-pm2.sh e setup-windows-using-pm2.sh.
module.exports = {
	apps: [
		{
			name: "elysia-api",
			cwd: "./api",
			script: "bun",
			args: "run dev",
			env: { NODE_ENV: "development" },
			autorestart: true,
			max_memory_restart: "300M",
		},
		{
			name: "elysia-frontend",
			cwd: "./frontend",
			script: "bun",
			args: "run dev",
			env: { NODE_ENV: "development" },
			autorestart: true,
			max_memory_restart: "300M",
		},
		{
			name: "elysia-bot",
			cwd: "./bot",
			script: "bun",
			args: "run dev",
			env: { NODE_ENV: "development" },
			autorestart: true,
			max_memory_restart: "300M",
		},
	],
};
