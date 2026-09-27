// Same password-strength rules as the frontend
// (frontend/src/components/password-strength-input.tsx), duplicated on purpose
// (see docs/code-conventions.md, sync points).
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

/** Labels of the rules the password doesn't meet yet. */
export function failingPasswordRules(value: string): string[] {
	return PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.label);
}
