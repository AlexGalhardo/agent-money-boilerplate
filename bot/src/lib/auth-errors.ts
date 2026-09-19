// Mesmo mapa de error codes do better-auth usado no frontend (ver
// frontend/src/lib/auth-errors.ts) — duplicado de propósito, no mesmo
// espírito de categoryLabels em bot/src/formatting/format.ts, pra não
// depender do workspace do frontend só por causa de um mapa de strings.
// `error.body.code` (better-auth chamado direto via `auth.api.*`, sem HTTP)
// é estável entre versões; `error.body.message` não é — vem sempre em
// inglês, então nunca deve ir pro chat sem passar por essa tradução.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
	USER_NOT_FOUND: "Usuário não encontrado",
	FAILED_TO_CREATE_USER: "Não foi possível criar o usuário",
	FAILED_TO_CREATE_SESSION: "Não foi possível criar a sessão",
	INVALID_PASSWORD: "Senha incorreta",
	INVALID_EMAIL: "E-mail inválido",
	INVALID_EMAIL_OR_PASSWORD: "E-mail e/ou senha incorretos",
	INVALID_USER: "Usuário inválido",
	INVALID_TOKEN: "Token inválido",
	TOKEN_EXPIRED: "Token expirado",
	USER_EMAIL_NOT_FOUND: "E-mail do usuário não encontrado",
	EMAIL_NOT_VERIFIED: "E-mail ainda não confirmado",
	PASSWORD_TOO_SHORT: "Senha muito curta",
	PASSWORD_TOO_LONG: "Senha muito longa",
	USER_ALREADY_EXISTS: "Já existe uma conta com esse e-mail",
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta com esse e-mail — use outro e-mail",
	CREDENTIAL_ACCOUNT_NOT_FOUND: "Conta com senha não encontrada",
	SESSION_EXPIRED: "Sessão expirada — faça login novamente para continuar",
	ACCOUNT_NOT_FOUND: "Conta não encontrada",
	VERIFICATION_EMAIL_NOT_ENABLED: "Confirmação de e-mail não está habilitada",
	EMAIL_ALREADY_VERIFIED: "Esse e-mail já foi confirmado",
	VALIDATION_ERROR: "Dados inválidos",
	MISSING_FIELD: "Campo obrigatório não informado",
};

/**
 * Traduz um erro do better-auth (lançado como `APIError`, com `.body.code`)
 * pro português. Quando o code não está mapeado, usa o `fallback` (já em
 * português) passado pelo chamador.
 */
export function translateAuthError(code: string | null | undefined, fallback: string): string {
	if (code && code in AUTH_ERROR_MESSAGES) return AUTH_ERROR_MESSAGES[code] as string;
	return fallback;
}
