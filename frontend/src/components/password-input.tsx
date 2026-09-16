import { useState } from "react";
import { inputClassName } from "./auth-card";

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

export function PasswordInput({
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
	);
}
