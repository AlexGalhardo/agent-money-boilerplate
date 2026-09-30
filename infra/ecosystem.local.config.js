// PM2 for local development without Docker — runs the 3 workspaces in watch
// mode (`bun run dev` in each). Unlike ecosystem.config.js (VPS deploy),
// which expects compiled builds (backend/server binary, frontend/server.ts +
// frontend/dist) and isn't meant for iterating locally.
// Used by setups/setup-pm2.sh.
module.exports = {
	apps: [
		{
			name: "elysia-backend",
			cwd: "./backend",
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
