import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import { AuthShell } from "@/components/auth-shell";
import { PasswordChecklist } from "@/components/password-checklist";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { resetPassword } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";
import { isStrongPassword } from "@/lib/password-rules";

const INVALID_LINK = "Link inválido ou expirado. Volte para “Esqueci minha senha” e solicite um novo.";

export default function ResetPasswordScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ token?: string }>();
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const token = params.token ?? "";

	async function onSubmit(): Promise<void> {
		setError(null);

		if (!token) {
			setError(INVALID_LINK);
			return;
		}
		if (!isStrongPassword(password)) {
			setError("A senha não atende aos requisitos abaixo.");
			return;
		}

		setSubmitting(true);
		const { error: resetError } = await resetPassword({ newPassword: password, token });
		setSubmitting(false);

		if (resetError) {
			setError(translateAuthError(resetError, "Não foi possível redefinir sua senha"));
			return;
		}

		setDone(true);
		setTimeout(() => router.replace("/login"), 1200);
	}

	return (
		<AuthShell
			title="Nova senha"
			subtitle="Escolha uma nova senha para sua conta."
			footer={
				<Link href="/login" className="text-subhead font-semibold text-fg">
					Voltar para o login
				</Link>
			}
		>
			{!token ? <Notice kind="error" message={INVALID_LINK} /> : null}
			<TextField
				label="Nova senha"
				value={password}
				onChangeText={setPassword}
				placeholder="Crie uma nova senha forte"
				autoComplete="new-password"
				secureTextEntry
			/>
			<PasswordChecklist password={password} />
			<Notice kind="error" message={token ? error : null} />
			<Notice kind="success" message={done ? "Senha redefinida. Redirecionando…" : null} />
			<Button label="Redefinir senha" onPress={onSubmit} loading={submitting} disabled={!password || !token} />
		</AuthShell>
	);
}
