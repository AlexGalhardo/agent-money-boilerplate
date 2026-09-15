import { useState } from "react";
import { inputClassName } from "./auth-card";

export const PASSWORD_RULES: { key: string; label: string; test: (value: string) => boolean }[] = [
	{ key: "length", label: "Pelo menos 8 caracteres", test: (value) => value.length >= 8 },
	{ key: "lowercase", label: "Uma letra minúscula (a-z)", test: (value) => /[a-z]/.test(value) },
	{ key: "uppercase", label: "Uma letra maiúscula (A-Z)", test: (value) => /[A-Z]/.test(value) },
	{ key: "number", label: "Um número (0-9)", test: (value) => /\d/.test(value) },
	{ key: "special", label: "Um caractere especial (ex: !@#$%)", test: (value) => /[^A-Za-z0-9]/.test(value) },
];

export function isStrongPassword(value: string): boolean {
	return PASSWORD_RULES.every((rule) => rule.test(value));
}

function EyeIcon() {
	return (
		<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
			<path
				d="M1.5 12s3.75-7.5 10.5-7.5S22.5 12 22.5 12s-3.75 7.5-10.5 7.5S1.5 12 1.5 12Z"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
		</svg>
	);
}

function EyeOffIcon() {
	return (
		<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
			<path
				d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M6.5 6.6C3.9 8.2 2 12 2 12s3.75 7.5 10.5 7.5c2.13 0 3.94-.5 5.45-1.24M9.9 4.7A10.9 10.9 0 0 1 12 4.5c6.75 0 10.5 7.5 10.5 7.5a17.6 17.6 0 0 1-2.6 3.65"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
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
	const [visible, setVisible] = useState(false);

	return (
		<div className="flex flex-col gap-1.5">
			<div className="relative">
				<input
					id={id}
					name={name}
					type={visible ? "text" : "password"}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					placeholder={placeholder}
					className={`${inputClassName} w-full pr-10`}
					aria-invalid={Boolean(error)}
				/>
				<button
					type="button"
					onClick={() => setVisible((current) => !current)}
					aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
					className="absolute inset-y-0 right-0 flex items-center px-3 text-(--color-fg-muted) hover:text-(--color-fg)"
				>
					{visible ? <EyeOffIcon /> : <EyeIcon />}
				</button>
			</div>

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
