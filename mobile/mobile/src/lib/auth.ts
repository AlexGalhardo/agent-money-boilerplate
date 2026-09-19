import * as Crypto from "expo-crypto";

import { getDb } from "./db";

export type User = { id: number; email: string; name: string };

type UserRow = {
	id: number;
	email: string;
	name: string;
	password_hash: string;
	password_salt: string;
	biometric_enabled: number;
};

function randomSalt(): string {
	const bytes = Crypto.getRandomBytes(16);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function hashPassword(password: string, salt: string): Promise<string> {
	return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function nameFromEmail(email: string): string {
	const local = email.split("@")[0] ?? "";
	if (!local) return "Você";
	return local.charAt(0).toUpperCase() + local.slice(1);
}

export async function signUp(email: string, password: string): Promise<User> {
	const db = await getDb();
	const normEmail = email.trim().toLowerCase();

	if (!isValidEmail(normEmail)) {
		throw new Error("Informe um e-mail válido.");
	}
	if (password.length < 6) {
		throw new Error("A senha deve ter ao menos 6 caracteres.");
	}

	const existing = await db.getFirstAsync<{ id: number }>("SELECT id FROM users WHERE email = ?", normEmail);
	if (existing) {
		throw new Error("Já existe uma conta com este e-mail.");
	}

	const salt = randomSalt();
	const passwordHash = await hashPassword(password, salt);
	const name = nameFromEmail(normEmail);
	const result = await db.runAsync(
		"INSERT INTO users (email, name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)",
		normEmail,
		name,
		passwordHash,
		salt,
		new Date().toISOString(),
	);

	const user: User = { id: result.lastInsertRowId, email: normEmail, name };
	await setSession(user.id);
	return user;
}

export async function signIn(email: string, password: string): Promise<User> {
	const db = await getDb();
	const normEmail = email.trim().toLowerCase();

	const row = await db.getFirstAsync<UserRow>(
		"SELECT id, email, name, password_hash, password_salt, biometric_enabled FROM users WHERE email = ?",
		normEmail,
	);
	if (!row) {
		throw new Error("E-mail ou senha incorretos.");
	}

	const passwordHash = await hashPassword(password, row.password_salt);
	if (passwordHash !== row.password_hash) {
		throw new Error("E-mail ou senha incorretos.");
	}

	const user: User = { id: row.id, email: row.email, name: row.name };
	await setSession(user.id);
	return user;
}

export async function getUser(userId: number): Promise<User | null> {
	const db = await getDb();
	const row = await db.getFirstAsync<User>("SELECT id, email, name FROM users WHERE id = ?", userId);
	return row ?? null;
}

export async function updateDisplayName(userId: number, name: string): Promise<User> {
	const trimmed = name.trim();
	if (trimmed.length < 2) {
		throw new Error("O nome deve ter ao menos 2 caracteres.");
	}
	if (trimmed.length > 40) {
		throw new Error("O nome deve ter no máximo 40 caracteres.");
	}
	const db = await getDb();
	await db.runAsync("UPDATE users SET name = ? WHERE id = ?", trimmed, userId);
	const user = await getUser(userId);
	if (!user) throw new Error("Usuário não encontrado.");
	return user;
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
	if (newPassword.length < 6) {
		throw new Error("A nova senha deve ter ao menos 6 caracteres.");
	}
	const db = await getDb();
	const row = await db.getFirstAsync<UserRow>(
		"SELECT id, email, name, password_hash, password_salt, biometric_enabled FROM users WHERE id = ?",
		userId,
	);
	if (!row) {
		throw new Error("Usuário não encontrado.");
	}
	const currentHash = await hashPassword(currentPassword, row.password_salt);
	if (currentHash !== row.password_hash) {
		throw new Error("A senha atual está incorreta.");
	}
	const salt = randomSalt();
	const nextHash = await hashPassword(newPassword, salt);
	await db.runAsync("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?", nextHash, salt, userId);
}

export async function isBiometricEnabled(userId: number): Promise<boolean> {
	const db = await getDb();
	const row = await db.getFirstAsync<{ biometric_enabled: number }>(
		"SELECT biometric_enabled FROM users WHERE id = ?",
		userId,
	);
	return !!row?.biometric_enabled;
}

export async function setBiometricEnabled(userId: number, enabled: boolean): Promise<void> {
	const db = await getDb();
	await db.runAsync("UPDATE users SET biometric_enabled = ? WHERE id = ?", enabled ? 1 : 0, userId);
}

export type GoogleProfile = {
	sub: string;
	email: string;
	name?: string;
};

export async function signInWithGoogleProfile(profile: GoogleProfile): Promise<User> {
	const db = await getDb();
	const normEmail = profile.email.trim().toLowerCase();

	let row = await db.getFirstAsync<UserRow>(
		"SELECT id, email, name, password_hash, password_salt, biometric_enabled FROM users WHERE google_id = ? OR email = ?",
		profile.sub,
		normEmail,
	);

	if (row) {
		await db.runAsync("UPDATE users SET google_id = ? WHERE id = ?", profile.sub, row.id);
	} else {
		const salt = randomSalt();
		const placeholderHash = await hashPassword(randomSalt(), salt);
		const name = profile.name?.trim() || nameFromEmail(normEmail);
		const result = await db.runAsync(
			"INSERT INTO users (email, name, password_hash, password_salt, created_at, google_id) VALUES (?, ?, ?, ?, ?, ?)",
			normEmail,
			name,
			placeholderHash,
			salt,
			new Date().toISOString(),
			profile.sub,
		);
		row = await db.getFirstAsync<UserRow>(
			"SELECT id, email, name, password_hash, password_salt, biometric_enabled FROM users WHERE id = ?",
			result.lastInsertRowId,
		);
	}

	if (!row) throw new Error("Não foi possível vincular a conta Google.");

	const user: User = { id: row.id, email: row.email, name: row.name };
	await setSession(user.id);
	return user;
}

export async function setSession(userId: number): Promise<void> {
	const db = await getDb();
	await db.runAsync(
		"INSERT INTO session (id, user_id) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id",
		userId,
	);
}

export async function clearSession(): Promise<void> {
	const db = await getDb();
	await db.runAsync("DELETE FROM session WHERE id = 1");
}

export async function getSessionUser(): Promise<User | null> {
	const db = await getDb();
	const session = await db.getFirstAsync<{ user_id: number }>("SELECT user_id FROM session WHERE id = 1");
	if (!session) return null;

	const user = await db.getFirstAsync<User>("SELECT id, email, name FROM users WHERE id = ?", session.user_id);
	return user ?? null;
}
