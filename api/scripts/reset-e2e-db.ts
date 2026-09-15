import { existsSync, unlinkSync } from "node:fs";

for (const suffix of ["", "-journal", "-wal", "-shm"]) {
	const path = `e2e.db${suffix}`;
	if (existsSync(path)) unlinkSync(path);
}
