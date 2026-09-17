import { existsSync, unlinkSync } from "node:fs";

for (const suffix of ["", "-journal", "-wal", "-shm"]) {
	const path = `test.db${suffix}`;
	if (existsSync(path)) unlinkSync(path);
}
