import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AuthCard, FormField, inputClassName } from "../components/auth-card";
import { requestPasswordReset } from "../lib/auth-client";
import { redirectIfAuthenticated } from "../lib/redirect-if-authenticated";

export const Route = createFileRoute("/esqueci-senha")({
	head: () => ({ meta: [{ title: "Recuperar senha — Money" }] }),
	beforeLoad: redirectIfAuthenticated,
	component: ForgetPasswordPage,
});

const schema = z.object({ email: z.email("E-mail inválido") });

function ForgetPasswordPage() {
	const [error, setError] = useState<string | null>(null);
	const [sent, setSent] = useState(false);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setError(null);

		const formData = new FormData(event.currentTarget);
		const result = schema.safeParse({ email: formData.get("email") });

		if (!result.success) {
			setError(result.error.issues[0]?.message ?? "E-mail inválido");
			return;
		}

		setLoading(true);
		await requestPasswordReset({ email: result.data.email, redirectTo: "/resetar-senha" });
		setLoading(false);
		setSent(true);
	}

	return (
		<AuthCard title="Recuperar senha" subtitle="Enviaremos um link de redefinição para o seu e-mail.">
			{sent ? (
				<p role="status" className="rounded-lg bg-brand-500/10 px-4 py-3 text-sm text-brand-600">
					Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
				</p>
			) : (
				<form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
					{error && (
						<p role="alert" className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">
							{error}
						</p>
					)}

					<FormField label="E-mail" id="email">
						<input id="email" name="email" type="email" className={inputClassName} />
					</FormField>

					<button
						type="submit"
						disabled={loading}
						className="rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-black hover:bg-brand-400 disabled:opacity-60"
					>
						{loading ? "Enviando..." : "Enviar link de recuperação"}
					</button>
				</form>
			)}
		</AuthCard>
	);
}
