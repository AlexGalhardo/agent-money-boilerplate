import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AuthCard, FormField, inputClassName } from "../components/auth-card";
import { GoogleButton } from "../components/google-button";
import { TwoFactorModal } from "../components/two-factor-modal";
import { authClient, signIn } from "../lib/auth-client";
import { redirectIfAuthenticated } from "../lib/redirect-if-authenticated";

export const Route = createFileRoute("/entrar")({
	head: () => ({ meta: [{ title: "Entrar — Elysia Finanças" }] }),
	beforeLoad: redirectIfAuthenticated,
	component: LoginPage,
});

const loginSchema = z.object({
	email: z.email("E-mail inválido"),
	password: z.string().min(1, "Informe sua senha"),
});

function LoginPage() {
	const navigate = useNavigate();
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
	const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
	const [twoFactorMethods, setTwoFactorMethods] = useState<string[] | null>(null);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setFormError(null);

		const formData = new FormData(event.currentTarget);
		const result = loginSchema.safeParse({
			email: formData.get("email"),
			password: formData.get("password"),
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
		const { data, error } = await signIn.email(result.data);
		setLoading(false);

		if (error) {
			if (error.code === "EMAIL_NOT_VERIFIED") {
				setUnverifiedEmail(result.data.email);
				return;
			}
			setFormError(error.message ?? "E-mail e/ou senha incorretos");
			return;
		}

		if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
			const methods = (data as { twoFactorMethods?: string[] }).twoFactorMethods;
			setTwoFactorMethods(methods ?? []);
			return;
		}

		await navigate({ to: "/dashboard" });
	}

	async function handleResendVerification(): Promise<void> {
		if (!unverifiedEmail) return;
		setResendState("sending");
		await authClient.sendVerificationEmail({ email: unverifiedEmail, callbackURL: "/entrar" });
		setResendState("sent");
	}

	if (unverifiedEmail) {
		return (
			<AuthCard title="Confirme seu e-mail" subtitle="Você precisa confirmar seu e-mail antes de entrar.">
				<p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500">
					Ainda não confirmamos <strong>{unverifiedEmail}</strong>. Verifique sua caixa de entrada ou reenvie
					o link de confirmação.
				</p>

				{resendState === "sent" ? (
					<p role="status" className="mt-4 rounded-lg bg-brand-500/10 px-4 py-3 text-sm text-brand-600">
						Link de confirmação reenviado.
					</p>
				) : (
					<button
						type="button"
						onClick={handleResendVerification}
						disabled={resendState === "sending"}
						className="mt-4 font-medium text-brand-600 hover:underline disabled:opacity-60"
					>
						{resendState === "sending" ? "Reenviando..." : "Reenviar link para confirmar e-mail"}
					</button>
				)}

				<p className="mt-4 text-center text-sm text-(--color-fg-muted)">
					<button
						type="button"
						onClick={() => setUnverifiedEmail(null)}
						className="font-medium text-brand-600 hover:underline"
					>
						Voltar
					</button>
				</p>
			</AuthCard>
		);
	}

	return (
		<AuthCard title="Entrar" subtitle="Acesse sua conta para ver seu painel financeiro.">
			<div className="flex flex-col gap-4">
				<GoogleButton label="Entrar com Google" />

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
					<FormField label="E-mail" id="email" error={errors.email}>
						<input
							id="email"
							name="email"
							type="email"
							className={inputClassName}
							aria-invalid={Boolean(errors.email)}
						/>
					</FormField>

					<FormField label="Senha" id="password" error={errors.password}>
						<input
							id="password"
							name="password"
							type="password"
							className={inputClassName}
							aria-invalid={Boolean(errors.password)}
						/>
					</FormField>

					<Link to="/esqueci-senha" className="text-right text-sm text-brand-600 hover:underline">
						Esqueci minha senha
					</Link>

					<button
						type="submit"
						disabled={loading}
						className="rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-black hover:bg-brand-400 disabled:opacity-60"
					>
						{loading ? "Entrando..." : "Entrar"}
					</button>
				</form>

				<p className="text-center text-sm text-(--color-fg-muted)">
					Não tem conta?{" "}
					<Link to="/criar-conta" className="font-medium text-brand-600 hover:underline">
						Criar conta
					</Link>
				</p>
			</div>

			{twoFactorMethods && (
				<TwoFactorModal
					methods={twoFactorMethods}
					onVerified={() => navigate({ to: "/dashboard" })}
					onClose={() => setTwoFactorMethods(null)}
				/>
			)}
		</AuthCard>
	);
}
