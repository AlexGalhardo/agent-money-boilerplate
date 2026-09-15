import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY = Buffer.from(env.ENCRYPTION_KEY, "hex");

/**
 * Criptografa dados sensíveis de transações financeiras antes de persistir
 * no banco (AES-256-GCM). Retorna `iv:authTag:ciphertext` em hex, em um
 * único campo String, para funcionar identicamente em SQLite e Postgres.
 */
export function encrypt(plainText: string): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, KEY, iv);
	const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decrypt(payload: string): string {
	const [ivHex, authTagHex, ciphertextHex] = payload.split(":");

	if (!ivHex || !authTagHex || !ciphertextHex) {
		throw new Error("Payload criptografado em formato inválido");
	}

	const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, "hex"));
	decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

	const plainText = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]);

	return plainText.toString("utf8");
}
