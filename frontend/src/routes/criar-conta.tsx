import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AuthCard, FormField, inputClassName } from "../components/auth-card";
import { GoogleButton } from "../components/google-button";
import { isStrongPassword, PasswordStrengthInput } from "../components/password-strength-input";
import { signUp } from "../lib/auth-client";
import { translateAuthError } from "../lib/auth-errors";
import { redirectIfAuthenticated } from "../lib/redirect-if-authenticated";

export const Route = createFileRoute("/criar-conta")({
	head: () => ({ meta: [{ title: "Criar conta — Money" }] }),
	beforeLoad: redirectIfAuthenticated,
	component: SignupPage,
});

function capitalizeFirstLetter(value: string): string {
	return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}

const signupSchema = z.object({
	name: z
		.string()
		.trim()
		.min(4, "O nome precisa ter pelo menos 4 letras")
		.max(16, "O nome pode ter no máximo 16 caracteres"),
	email: z.email("E-mail inválido").max(48, "O e-mail pode ter no máximo 48 caracteres"),
	password: z.string().refine(isStrongPassword, "A senha não atende aos requisitos abaixo"),
});

function SignupPage() {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setFormError(null);

		const formData = new FormData(event.currentTarget);
		const result = signupSchema.safeParse({
			name,
			email: formData.get("email"),
			password,
		});

		if (!result.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of result.error.issues) {
				const key = issue.path[0];
				if (typeof key === "string") fieldErrors[key] = issue.message;
			}
			setErrors(fieldErrors);
			return;
		}

		setErrors({});
		setLoading(true);
		const { data, error } = await signUp.email({ ...result.data, name: capitalizeFirstLetter(result.data.name) });
		setLoading(false);

		if (error) {
			setFormError(translateAuthError(error, "Não foi possível criar sua conta"));
			return;
		}

		// requireEmailVerification faz o cadastro suceder sem criar sessão (token: null) —
		// o e-mail de confirmação já foi disparado pelo servidor nesse mesmo request.
		if (data?.token === null) {
			setPendingVerificationEmail(result.data.email);
			return;
		}

		await navigate({ to: "/dashboard" });
	}

	if (pendingVerificationEmail) {
		return (
			<AuthCard title="Confirme seu e-mail" subtitle="Falta só um passo para acessar sua conta.">
				<p role="status" className="rounded-lg bg-brand-500/10 px-4 py-3 text-sm text-brand-600">
					Enviamos um link de confirmação para <strong>{pendingVerificationEmail}</strong>. Confirme seu
					e-mail antes de acessar sua conta.
				</p>
				<p className="mt-4 text-center text-sm text-(--color-fg-muted)">
					<Link to="/entrar" className="font-medium text-brand-600 hover:underline">
						Voltar para o login
					</Link>
				</p>
			</AuthCard>
		);
	}

	return (
		<AuthCard title="Criar conta" subtitle="Leva menos de um minuto.">
			<div className="flex flex-col gap-4">
				<GoogleButton label="Criar conta com Google" />

				<div className="flex items-center gap-3 text-xs text-(--color-fg-muted)">
					<span className="h-px flex-1 bg-(--color-border)" />
					ou
					<span className="h-px flex-1 bg-(--color-border)" />
				</div>

				{formError && (
					<p role="alert" className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">
						{formError}
					</p>
				)}

				<form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
					<FormField label="Nome" id="name" error={errors.name}>
						<input
							id="name"
							name="name"
							type="text"
							value={name}
							onChange={(event) => setName(capitalizeFirstLetter(event.target.value))}
							placeholder="Digite seu nome"
							maxLength={16}
							className={inputClassName}
							aria-invalid={Boolean(errors.name)}
						/>
					</FormField>

					<FormField label="E-mail" id="email" error={errors.email}>
						<input
							id="email"
							name="email"
							type="email"
							placeholder="seu@email.com"
							maxLength={48}
							className={inputClassName}
							aria-invalid={Boolean(errors.email)}
						/>
					</FormField>

					<FormField label="Senha" id="password" error={errors.password}>
						<PasswordStrengthInput
							id="password"
							name="password"
							value={password}
							onChange={setPassword}
							placeholder="Crie uma senha forte"
						/>
					</FormField>

					<button
						type="submit"
						disabled={loading}
						className="rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-black hover:bg-brand-400 disabled:opacity-60"
					>
						{loading ? "Criando conta..." : "Criar conta"}
					</button>
				</form>

				<p className="text-center text-sm text-(--color-fg-muted)">
					Já tem conta?{" "}
					<Link to="/entrar" className="font-medium text-brand-600 hover:underline">
						Entrar
					</Link>
				</p>
			</div>
		</AuthCard>
	);
}
