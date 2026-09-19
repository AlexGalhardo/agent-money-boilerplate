import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA_VERSION = 2;

async function migrate(db: SQLite.SQLiteDatabase) {
	await db.execAsync("PRAGMA journal_mode = WAL;");

	const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
	const current = row?.user_version ?? 0;

	if (current < 1) {
		await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        amount_cents INTEGER NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions (user_id, date DESC);

      CREATE TABLE IF NOT EXISTS session (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        user_id INTEGER NOT NULL
      );
    `);
	}

	if (current < 2) {
		const columns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(users)");
		const names = new Set(columns.map((c) => c.name));
		if (!names.has("name")) {
			await db.execAsync("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT '';");
		}
		if (!names.has("google_id")) {
			await db.execAsync("ALTER TABLE users ADD COLUMN google_id TEXT;");
		}
		if (!names.has("biometric_enabled")) {
			await db.execAsync("ALTER TABLE users ADD COLUMN biometric_enabled INTEGER NOT NULL DEFAULT 0;");
		}
	}

	await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
	if (!dbPromise) {
		dbPromise = SQLite.openDatabaseAsync("op.db").then(async (db) => {
			await migrate(db);
			return db;
		});
	}
	return dbPromise;
}
