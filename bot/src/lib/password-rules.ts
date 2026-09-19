// Mesmas regras de força de senha do frontend (ver
// frontend/src/components/password-strength-input.tsx) — duplicadas de
// propósito, no mesmo espírito de categoryLabels em bot/src/formatting/format.ts,
// pra não depender do workspace do frontend (React/TanStack) só por causa
// de uma lista de regras.
export const PASSWORD_RULES: { label: string; test: (value: string) => boolean }[] = [
	{ label: "Entre 8 e 32 caracteres", test: (value) => value.length >= 8 && value.length <= 32 },
	{ label: "Uma letra minúscula (a-z)", test: (value) => /[a-z]/.test(value) },
	{ label: "Uma letra maiúscula (A-Z)", test: (value) => /[A-Z]/.test(value) },
	{ label: "Um número (0-9)", test: (value) => /\d/.test(value) },
	{ label: "Um caractere especial (ex: !@#$%)", test: (value) => /[^A-Za-z0-9]/.test(value) },
];

export function isStrongPassword(value: string): boolean {
	return PASSWORD_RULES.every((rule) => rule.test(value));
}

/** Lista em texto das regras que a senha ainda não atende. */
export function failingPasswordRules(value: string): string[] {
	return PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.label);
}
