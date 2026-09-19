// Mapa dos error codes nativos do better-auth (core + plugin twoFactor, ver
// node_modules/better-auth's BASE_ERROR_CODES e TWO_FACTOR_ERROR_CODES) para
// mensagens em português. `error.code` é estável entre versões; `error.message`
// não é — vem sempre em inglês direto do better-auth, então nunca deve ir pra
// tela sem passar por essa tradução.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
	USER_NOT_FOUND: "Usuário não encontrado",
	FAILED_TO_CREATE_USER: "Não foi possível criar o usuário",
	FAILED_TO_CREATE_SESSION: "Não foi possível criar a sessão",
	FAILED_TO_UPDATE_USER: "Não foi possível atualizar o usuário",
	FAILED_TO_GET_SESSION: "Não foi possível obter a sessão",
	INVALID_PASSWORD: "Senha incorreta",
	INVALID_EMAIL: "E-mail inválido",
	INVALID_EMAIL_OR_PASSWORD: "E-mail e/ou senha incorretos",
	INVALID_USER: "Usuário inválido",
	SOCIAL_ACCOUNT_ALREADY_LINKED: "Essa conta social já está vinculada a outro usuário",
	PROVIDER_NOT_FOUND: "Provedor de login não encontrado",
	INVALID_TOKEN: "Token inválido",
	TOKEN_EXPIRED: "Token expirado",
	ID_TOKEN_NOT_SUPPORTED: "Esse tipo de token não é suportado",
	FAILED_TO_GET_USER_INFO: "Não foi possível obter os dados do usuário",
	USER_EMAIL_NOT_FOUND: "E-mail do usuário não encontrado",
	EMAIL_NOT_VERIFIED: "E-mail ainda não confirmado",
	PASSWORD_TOO_SHORT: "Senha muito curta",
	PASSWORD_TOO_LONG: "Senha muito longa",
	USER_ALREADY_EXISTS: "Já existe uma conta com esse e-mail",
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta com esse e-mail — use outro e-mail",
	EMAIL_CAN_NOT_BE_UPDATED: "O e-mail não pode ser alterado",
	CHANGE_EMAIL_DISABLED: "A troca de e-mail está desativada",
	CREDENTIAL_ACCOUNT_NOT_FOUND: "Conta com senha não encontrada",
	SESSION_EXPIRED: "Sessão expirada — faça login novamente para continuar",
	FAILED_TO_UNLINK_LAST_ACCOUNT: "Você não pode desvincular seu único método de login",
	ACCOUNT_NOT_FOUND: "Conta não encontrada",
	USER_ALREADY_HAS_PASSWORD: "Sua conta já tem uma senha — informe-a para continuar",
	CROSS_SITE_NAVIGATION_LOGIN_BLOCKED: "Login bloqueado por segurança — tente novamente",
	VERIFICATION_EMAIL_NOT_ENABLED: "Confirmação de e-mail não está habilitada",
	EMAIL_ALREADY_VERIFIED: "Esse e-mail já foi confirmado",
	EMAIL_MISMATCH: "O e-mail não confere",
	SESSION_NOT_FRESH: "Confirme sua identidade novamente para continuar",
	LINKED_ACCOUNT_ALREADY_EXISTS: "Essa conta já está vinculada",
	INVALID_ORIGIN: "Origem da requisição inválida",
	INVALID_CALLBACK_URL: "URL de retorno inválida",
	INVALID_REDIRECT_URL: "URL de redirecionamento inválida",
	INVALID_ERROR_CALLBACK_URL: "URL de retorno de erro inválida",
	INVALID_NEW_USER_CALLBACK_URL: "URL de retorno para novo usuário inválida",
	MISSING_OR_NULL_ORIGIN: "Origem da requisição ausente",
	CALLBACK_URL_REQUIRED: "URL de retorno obrigatória",
	FAILED_TO_CREATE_VERIFICATION: "Não foi possível criar a verificação",
	FIELD_NOT_ALLOWED: "Campo não permitido",
	ASYNC_VALIDATION_NOT_SUPPORTED: "Validação assíncrona não suportada",
	VALIDATION_ERROR: "Dados inválidos",
	MISSING_FIELD: "Campo obrigatório não informado",
	METHOD_NOT_ALLOWED_DEFER_SESSION_REQUIRED: "Método não permitido",
	BODY_MUST_BE_AN_OBJECT: "Requisição inválida",
	PASSWORD_ALREADY_SET: "Sua conta já tem uma senha definida",

	// plugin twoFactor
	OTP_NOT_ENABLED: "Código por e-mail não está habilitado",
	OTP_NOT_CONFIGURED: "Código por e-mail não está disponível",
	OTP_HAS_EXPIRED: "O código expirou — solicite um novo",
	TOTP_NOT_ENABLED: "Autenticador (TOTP) não está habilitado",
	TOTP_ALREADY_ENABLED: "O autenticador (TOTP) já está ativado",
	TOTP_NOT_CONFIGURED: "Autenticador (TOTP) não está disponível",
	TWO_FACTOR_NOT_ENABLED: "A verificação em duas etapas não está ativada",
	BACKUP_CODES_NOT_ENABLED: "Códigos de backup não estão habilitados",
	INVALID_BACKUP_CODE: "Código de backup inválido",
	INVALID_CODE: "Código inválido",
	TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "Muitas tentativas — solicite um novo código",
	ACCOUNT_TEMPORARILY_LOCKED:
		"Muitas tentativas incorretas — sua conta foi bloqueada temporariamente. Tente novamente mais tarde",
	INVALID_TWO_FACTOR_COOKIE: "Sessão de verificação em duas etapas inválida — tente novamente",
};

/**
 * Traduz um erro do better-auth pelo `error.code` (estável entre versões).
 * `error.message` nunca é usado como texto exibido — é sempre inglês vindo
 * direto do better-auth. Quando o code não está mapeado, usa o `fallback`
 * (já em português) passado pelo chamador.
 */
export function translateAuthError(
	error: { code?: string | null; message?: string | null } | null | undefined,
	fallback: string,
): string {
	const code = error?.code;
	if (code && code in AUTH_ERROR_MESSAGES) return AUTH_ERROR_MESSAGES[code] as string;
	return fallback;
}
