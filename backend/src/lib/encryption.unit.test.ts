import { describe, expect, it } from "bun:test";
import { decrypt, decryptIfEncrypted, encrypt } from "./encryption";

describe("encryption", () => {
	it("encrypts and decrypts a string back to the original value", () => {
		const plainText = "Salário mensal — R$ 5.000,00";
		const encrypted = encrypt(plainText);

		expect(encrypted).not.toBe(plainText);
		expect(decrypt(encrypted)).toBe(plainText);
	});

	it("produces a different ciphertext each time (random IV)", () => {
		const plainText = "same input";
		const first = encrypt(plainText);
		const second = encrypt(plainText);

		expect(first).not.toBe(second);
		expect(decrypt(first)).toBe(plainText);
		expect(decrypt(second)).toBe(plainText);
	});

	it("throws when decrypting a malformed payload", () => {
		expect(() => decrypt("not-a-valid-payload")).toThrow();
	});

	it("throws when the ciphertext has been tampered with", () => {
		const encrypted = encrypt("some sensitive value");
		const [iv, authTag, ciphertext] = encrypted.split(":");
		if (!ciphertext) throw new Error("unexpected payload shape");

		// Flip the last byte so the value really changes (avoids a false
		// negative in the rare case the original byte was already "00").
		const lastByte = ciphertext.slice(-2);
		const flippedByte = (Number.parseInt(lastByte, 16) ^ 0xff).toString(16).padStart(2, "0");
		const tampered = `${iv}:${authTag}:${ciphertext.slice(0, -2)}${flippedByte}`;

		expect(() => decrypt(tampered)).toThrow();
	});

	it("decryptIfEncrypted decrypts payloads and passes legacy plaintext through", () => {
		expect(decryptIfEncrypted(encrypt("Abc!123xyz"))).toBe("Abc!123xyz");
		expect(decryptIfEncrypted("Abc!123xyz")).toBe("Abc!123xyz");
	});

	it("encrypts an empty string round-trip", () => {
		expect(decrypt(encrypt(""))).toBe("");
	});
});
