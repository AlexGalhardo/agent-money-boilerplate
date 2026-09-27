import { Link } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { requestPasswordReset } from "@/lib/auth-client";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function onSubmit(): Promise<void> {
		setError(null);
		if (!emailPattern.test(email)) {
			setError("Informe um e-mail válido.");
			return;
		}

		setSubmitting(true);
		// redirectTo is a deep link (scheme "money"): the e-mail opens the app
		// on the reset screen with the token in the URL — same flow as the
		// web's /esqueci-senha and /resetar-senha.
		await requestPasswordReset({ email, redirectTo: "money://reset-password" });
		setSubmitting(false);
		setSent(true);
	}

	return (
		<AuthShell
			title="Recuperar senha"
			subtitle="Enviaremos um link de redefinição para o seu e-mail."
			footer={
				<>
					<Text className="text-subhead text-muted">Lembrou a senha?</Text>
					<Link href="/login" className="text-subhead font-semibold text-fg">
						Entrar
					</Link>
				</>
			}
		>
			{sent ? (
				<Notice
					kind="success"
					message="Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Abra o link pelo celular para voltar direto ao app."
				/>
			) : (
				<>
					<TextField
						label="E-mail"
						value={email}
						onChangeText={setEmail}
						placeholder="voce@exemplo.com"
						autoCapitalize="none"
						autoCorrect={false}
						autoComplete="email"
						keyboardType="email-address"
						inputMode="email"
					/>
					<Notice kind="error" message={error} />
					<Button label="Enviar link" onPress={onSubmit} loading={submitting} disabled={!email} />
				</>
			)}
		</AuthShell>
	);
}
