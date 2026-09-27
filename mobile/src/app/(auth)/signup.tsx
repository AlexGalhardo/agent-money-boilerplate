import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

import { AuthShell, Divider } from "@/components/auth-shell";
import { PasswordChecklist } from "@/components/password-checklist";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/ui/google-button";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { signUp } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";
import { isStrongPassword } from "@/lib/password-rules";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function capitalizeFirstLetter(value: string): string {
	return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}

export default function SignUpScreen() {
	const router = useRouter();

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

	async function onSubmit(): Promise<void> {
		setError(null);

		const trimmedName = name.trim();
		if (trimmedName.length < 4 || trimmedName.length > 16) {
			setError("O nome precisa ter entre 4 e 16 letras.");
			return;
		}
		if (email.length > 48 || !emailPattern.test(email)) {
			setError("Informe um e-mail válido (máximo 48 caracteres).");
			return;
		}
		if (!isStrongPassword(password)) {
			setError("A senha não atende aos requisitos abaixo.");
			return;
		}

		setSubmitting(true);
		const { data, error: signUpError } = await signUp.email({
			name: capitalizeFirstLetter(trimmedName),
			email,
			password,
		});
		setSubmitting(false);

		if (signUpError) {
			setError(translateAuthError(signUpError, "Não foi possível criar sua conta"));
			return;
		}

		if (data?.token === null) {
			setPendingVerificationEmail(email);
			return;
		}

		router.replace("/dashboard");
	}

	if (pendingVerificationEmail) {
		return (
			<AuthShell
				title="Confirme seu e-mail"
				subtitle={`Enviamos um link de confirmação para ${pendingVerificationEmail}. Confirme antes de acessar sua conta.`}
			>
				<Button label="Voltar para o login" variant="secondary" onPress={() => router.replace("/login")} />
			</AuthShell>
		);
	}

	return (
		<AuthShell
			title="Criar conta"
			subtitle="Leva menos de um minuto."
			footer={
				<>
					<Text className="text-subhead text-muted">Já tem uma conta?</Text>
					<Link href="/login" className="text-subhead font-semibold text-fg">
						Entrar
					</Link>
				</>
			}
		>
			<TextField
				label="Nome"
				value={name}
				onChangeText={(value) => setName(capitalizeFirstLetter(value))}
				placeholder="Como devemos te chamar?"
				maxLength={16}
				autoCapitalize="words"
				autoComplete="given-name"
			/>
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
				maxLength={48}
			/>
			<TextField
				label="Senha"
				value={password}
				onChangeText={setPassword}
				placeholder="Crie uma senha forte"
				autoComplete="new-password"
				secureTextEntry
			/>
			<PasswordChecklist password={password} />

			<Notice kind="error" message={error} />

			<Button
				label="Criar conta"
				onPress={onSubmit}
				loading={submitting}
				disabled={!name || !email || !password}
			/>
			<Divider label="ou" />
			<GoogleButton label="Continuar com Google" onError={setError} />
		</AuthShell>
	);
}
