// Configuração do PM2 para deploy em VPS sem Docker (api/server precisa
// ter sido compilado antes com `bun run build` em api/ e frontend/).
module.exports = {
	apps: [
		{
			name: "elysia-api",
			cwd: "./api",
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
			env: { NODE_ENV: "production", PORT: "4001" },
			instances: 1,
			autorestart: true,
			max_memory_restart: "300M",
		},
	],
};
