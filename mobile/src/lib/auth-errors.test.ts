import { translateAuthError } from "./auth-errors";

describe("translateAuthError", () => {
	it("translates a known better-auth code to portuguese", () => {
		expect(translateAuthError({ code: "INVALID_PASSWORD" }, "fallback")).toBe("Senha incorreta");
		expect(translateAuthError({ code: "INVALID_EMAIL_OR_PASSWORD" }, "fallback")).toBe(
			"E-mail e/ou senha incorretos",
		);
	});

	it("falls back to the caller-provided message for an unmapped code", () => {
		expect(translateAuthError({ code: "SOME_FUTURE_CODE" }, "mensagem padrão")).toBe("mensagem padrão");
	});

	it("falls back when there is no error or no code", () => {
		expect(translateAuthError(undefined, "mensagem padrão")).toBe("mensagem padrão");
		expect(translateAuthError(null, "mensagem padrão")).toBe("mensagem padrão");
		expect(translateAuthError({}, "mensagem padrão")).toBe("mensagem padrão");
	});
});
