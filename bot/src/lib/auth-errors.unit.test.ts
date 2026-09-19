import { describe, expect, it } from "bun:test";
import { translateAuthError } from "./auth-errors";

describe("translateAuthError", () => {
	it("translates a known better-auth code to portuguese", () => {
		expect(translateAuthError("INVALID_PASSWORD", "fallback")).toBe("Senha incorreta");
		expect(translateAuthError("INVALID_EMAIL_OR_PASSWORD", "fallback")).toBe("E-mail e/ou senha incorretos");
		expect(translateAuthError("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", "fallback")).toBe(
			"Já existe uma conta com esse e-mail — use outro e-mail",
		);
	});

	it("falls back to the caller-provided message for an unmapped code", () => {
		expect(translateAuthError("SOME_FUTURE_CODE", "mensagem padrão")).toBe("mensagem padrão");
	});

	it("falls back when no code is given", () => {
		expect(translateAuthError(undefined, "mensagem padrão")).toBe("mensagem padrão");
		expect(translateAuthError(null, "mensagem padrão")).toBe("mensagem padrão");
	});
});
