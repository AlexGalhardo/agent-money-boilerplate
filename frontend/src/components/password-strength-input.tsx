import { PasswordInput } from "./password-input";

export const PASSWORD_RULES: { key: string; label: string; test: (value: string) => boolean }[] = [
	{ key: "length", label: "Entre 8 e 32 caracteres", test: (value) => value.length >= 8 && value.length <= 32 },
	{ key: "lowercase", label: "Uma letra minúscula (a-z)", test: (value) => /[a-z]/.test(value) },
	{ key: "uppercase", label: "Uma letra maiúscula (A-Z)", test: (value) => /[A-Z]/.test(value) },
	{ key: "number", label: "Um número (0-9)", test: (value) => /\d/.test(value) },
	{ key: "special", label: "Um caractere especial (ex: !@#$%)", test: (value) => /[^A-Za-z0-9]/.test(value) },
];

export function isStrongPassword(value: string): boolean {
	return PASSWORD_RULES.every((rule) => rule.test(value));
}

export function PasswordStrengthInput({
	id,
	name,
	value,
	onChange,
	placeholder,
	error,
}: {
	id: string;
	name: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	error?: string;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<PasswordInput
				id={id}
				name={name}
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				error={error}
			/>

			{error && <p className="text-sm text-red-500">{error}</p>}

			{value.length > 0 && (
				<ul className="mt-1 flex flex-col gap-1 text-xs">
					{PASSWORD_RULES.map((rule) => {
						const ok = rule.test(value);
						return (
							<li
								key={rule.key}
								className={`flex items-center gap-1.5 ${ok ? "text-emerald-600" : "text-red-500"}`}
							>
								<span aria-hidden="true">{ok ? "✓" : "✗"}</span>
								{rule.label}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
