// Local dev stack in one terminal: backend (:4000), web frontend (:4001),
// Expo (Metro + QR code for Expo Go) and the Electron desktop app.
//   bun run dev:all [--skip mobile,desktop] [--host 192.168.0.10]
// Expo gets EXPO_PUBLIC_API_URL=http://<LAN IP>:4000: a phone resolves
// "localhost" to itself, never to this computer. Expo keeps the terminal
// (stdin + QR code); the other services print with a [name] prefix.
// Ctrl+C stops everything.
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { join } from "node:path";
import type { Subprocess } from "bun";

const ROOT = join(import.meta.dir, "..");
const BACKEND_URL = "http://localhost:4000";
const FRONTEND_URL = "http://localhost:4001";

const args = process.argv.slice(2);
const argValue = (name: string): string | undefined => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};
const skip = new Set((argValue("--skip") ?? "").split(",").filter(Boolean));

// Virtual adapters (WSL, Hyper-V, Docker, VMs) also have private IPv4s that
// a phone on the Wi-Fi cannot reach.
const VIRTUAL_ADAPTER = /vethernet|wsl|hyper-v|virtualbox|vmware|docker|br-|veth|utun|tailscale|zerotier/i;

function lanIp(): string | undefined {
	const candidates = Object.entries(networkInterfaces()).flatMap(([name, addresses]) =>
		(addresses ?? [])
			.filter((address) => address.family === "IPv4" && !address.internal)
			.map((address) => ({ name, ip: address.address })),
	);
	const isPrivate = (ip: string): boolean => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
	return (
		candidates.find((c) => isPrivate(c.ip) && !VIRTUAL_ADAPTER.test(c.name)) ??
		candidates.find((c) => isPrivate(c.ip))
	)?.ip;
}

async function waitFor(url: string, timeoutMs = 120_000): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			await fetch(url);
			return true;
		} catch {
			await Bun.sleep(1000);
		}
	}
	return false;
}

const children: Subprocess[] = [];

async function pipeWithPrefix(stream: ReadableStream<Uint8Array>, prefix: string): Promise<void> {
	const decoder = new TextDecoder();
	let pending = "";
	for await (const chunk of stream) {
		pending += decoder.decode(chunk, { stream: true });
		const lines = pending.split(/\r?\n/);
		pending = lines.pop() ?? "";
		for (const line of lines) console.log(`${prefix} ${line}`);
	}
	if (pending) console.log(`${prefix} ${pending}`);
}

function start(name: string, cmd: string[], options: { cwd: string; env?: Record<string, string>; tty?: boolean }) {
	const prefix = `[${name}]`;
	const child = Bun.spawn(cmd, {
		cwd: join(ROOT, options.cwd),
		env: { ...process.env, ...options.env, FORCE_COLOR: "1" },
		stdin: options.tty ? "inherit" : "ignore",
		stdout: options.tty ? "inherit" : "pipe",
		stderr: options.tty ? "inherit" : "pipe",
	});
	if (child.stdout instanceof ReadableStream) void pipeWithPrefix(child.stdout, prefix);
	if (child.stderr instanceof ReadableStream) void pipeWithPrefix(child.stderr, prefix);
	void child.exited.then((code) => console.log(`${prefix} exited with code ${code}`));
	children.push(child);
}

function stopAll(): never {
	for (const child of children) {
		if (child.exitCode !== null) continue;
		// `bun run` spawns the real server as a grandchild; on Windows killing
		// the parent alone leaves Vite/Metro holding their ports.
		if (process.platform === "win32") Bun.spawnSync(["taskkill", "/pid", String(child.pid), "/T", "/F"]);
		else child.kill();
	}
	process.exit(0);
}
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

if (!existsSync(join(ROOT, "backend", ".env"))) {
	console.error("backend/.env is missing: copy backend/.env.example and follow docs/deploy/local-setup.md.");
	process.exit(1);
}
if (!existsSync(join(ROOT, "backend", "prisma", "generated"))) {
	console.log("[dev] generating the Prisma Client (first run)…");
	Bun.spawnSync(["bun", "run", "db:generate"], { cwd: join(ROOT, "backend"), stdout: "inherit", stderr: "inherit" });
}

start("backend", ["bun", "run", "dev"], { cwd: "backend" });
if (!skip.has("web") || !skip.has("desktop")) start("web", ["bun", "run", "dev"], { cwd: "frontend" });

if (!(await waitFor(BACKEND_URL))) {
	console.error(`[dev] backend did not answer on ${BACKEND_URL}; see the [backend] output above.`);
	stopAll();
}
console.log(`[dev] backend ready: ${BACKEND_URL}  (web dashboard: ${FRONTEND_URL})`);

if (!skip.has("desktop")) {
	void waitFor(FRONTEND_URL).then((ready) => {
		if (ready) start("desktop", ["bun", "run", "start"], { cwd: "desktop-electronjs" });
		else console.error(`[dev] ${FRONTEND_URL} never answered; desktop app not started.`);
	});
}

if (!skip.has("mobile")) {
	const host = argValue("--host") ?? lanIp();
	if (!host) {
		console.error("[dev] no LAN IPv4 found; pass --host <this computer's IP> for Expo Go.");
		stopAll();
	}
	const apiUrl = `http://${host}:4000`;
	console.log(`[dev] Expo → EXPO_PUBLIC_API_URL=${apiUrl} (phone and computer must share the Wi-Fi;`);
	console.log("[dev] on Windows allow Bun through the firewall for private networks if the phone cannot connect)");
	// --clear: EXPO_PUBLIC_* values are inlined at transform time; a cached
	// bundle from another IP would keep calling the old address.
	start("mobile", ["bunx", "expo", "start", "--lan", "--clear"], {
		cwd: "mobile",
		env: { EXPO_PUBLIC_API_URL: apiUrl },
		tty: true,
	});
}
