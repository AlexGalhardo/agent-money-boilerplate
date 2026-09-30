// PM2 config for a VPS deploy without Docker (run `bun run build` in
// backend/ and frontend/ first — backend/server is the compiled binary).
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
			// Read at runtime by the /auth, /users, /transactions… proxy in
			// server.ts (see frontend/proxy-paths.ts) — unlike the build-time
			// value (the public URL, see docs/deploy/vps.md), since backend
			// and frontend share this host.
			env: { NODE_ENV: "production", PORT: "4001", VITE_API_URL: "http://localhost:4000" },
			instances: 1,
			autorestart: true,
			max_memory_restart: "300M",
		},
	],
};
