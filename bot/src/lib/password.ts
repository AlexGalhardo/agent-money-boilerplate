import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export function hashPassword(plainPassword: string): string {
	return bcrypt.hashSync(plainPassword, SALT_ROUNDS);
}

export function verifyPassword(plainPassword: string, hash: string): boolean {
	return bcrypt.compareSync(plainPassword, hash);
}
