import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AuthCard, FormField, inputClassName } from "../components/auth-card";
import { resetPassword } from "../lib/auth-client";
import { redirectIfAuthenticated } from "../lib/redirect-if-authenticated";

const searchSchema = z.object({ token: z.string().optional() });
const passwordSchema = z.object({ password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres") });

export const Route = createFileRoute("/resetar-senha")({
	head: () => ({ meta: [{ title: "Redefinir senha — Money" }] }),
	beforeLoad: redirectIfAuthenticated,
	validateSearch: searchSchema,
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { token } = Route.useSearch();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setError(null);

		if (!token) {
			setError("Link inválido ou expirado. Solicite uma nova redefinição de senha.");
			return;
		}

		const formData = new FormData(event.currentTarget);
		const result = passwordSchema.safeParse({ password: formData.get("password") });

		if (!result.success) {
			setError(result.error.issues[0]?.message ?? "Senha inválida");
			return;
		}

		setLoading(true);
		const { error: resetError } = await resetPassword({ newPassword: result.data.password, token });
		setLoading(false);

		if (resetError) {
			setError(resetError.message ?? "Não foi possível redefinir sua senha");
			return;
		}

		await navigate({ to: "/entrar" });
	}

	return (
		<AuthCard title="Redefinir senha" subtitle="Escolha uma nova senha para sua conta.">
			<form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
				{error && (
					<p role="alert" className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">
						{error}
					</p>
				)}

				<FormField label="Nova senha" id="password">
					<input id="password" name="password" type="password" className={inputClassName} />
				</FormField>

				<button
					type="submit"
					disabled={loading}
					className="rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-black hover:bg-brand-400 disabled:opacity-60"
				>
					{loading ? "Salvando..." : "Redefinir senha"}
				</button>
			</form>
		</AuthCard>
	);
}
