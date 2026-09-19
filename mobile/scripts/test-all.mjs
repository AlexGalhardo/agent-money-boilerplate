#!/usr/bin/env bun
/**
 * Runs every automated check that works locally with no paid services:
 *   1. type-check (shared + backend + mobile)
 *   2. backend unit + integration tests (bun test, SQLite, mocked providers)
 *   3. mobile unit + component tests (jest-expo + RNTL)
 *
 * Maestro E2E is intentionally NOT run here — it needs a device/emulator and
 * sandbox credentials. Run it with `npm run e2e` (see e2e/README.md).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const steps = [
	["Type-check (shared)", "bunx", ["tsc", "--noEmit"], join(root, "shared")],
	["Type-check (backend)", "bunx", ["tsc", "--noEmit"], join(root, "backend")],
	["Type-check (mobile)", "bunx", ["tsc", "--noEmit"], join(root, "mobile")],
	["Backend tests", "bun", ["test"], join(root, "backend")],
	["Mobile tests", "bunx", ["jest", "--ci"], join(root, "mobile")],
];

let failed = 0;
for (const [name, cmd, args, cwd] of steps) {
	process.stdout.write(`\n\x1b[1m▶ ${name}\x1b[0m\n`);
	const res = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: true });
	if (res.status !== 0) {
		failed += 1;
		process.stdout.write(`\x1b[31m✖ ${name} failed\x1b[0m\n`);
	}
}

process.stdout.write(
	failed === 0 ? "\n\x1b[32m✓ all checks passed\x1b[0m\n" : `\n\x1b[31m✖ ${failed} step(s) failed\x1b[0m\n`,
);
process.exit(failed === 0 ? 0 : 1);
