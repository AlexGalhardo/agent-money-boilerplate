import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

import { AuthShell, Divider } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/ui/google-button";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { authClient, signIn } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";

export default function LoginScreen() {
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleLogin(): Promise<void> {
		setError(null);
		setSubmitting(true);
		const { data, error: signInError } = await signIn.email({ email, password });
		setSubmitting(false);

		if (signInError) {
			setError(
				signInError.code === "EMAIL_NOT_VERIFIED"
					? "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada."
					: translateAuthError(signInError, "E-mail e/ou senha incorretos"),
			);
			return;
		}

		if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
			setSubmitting(true);
			const { error: otpError } = await authClient.twoFactor.sendOtp();
			setSubmitting(false);
			if (otpError) {
				setError(translateAuthError(otpError, "Não foi possível enviar o código por e-mail"));
				return;
			}
			setNeedsTwoFactor(true);
			return;
		}

		router.replace("/dashboard");
	}

	async function handleVerifyCode(): Promise<void> {
		setError(null);
		setSubmitting(true);
		const { error: verifyError } = await authClient.twoFactor.verifyOtp({ code });
		setSubmitting(false);

		if (verifyError) {
			setError(translateAuthError(verifyError, "Código inválido"));
			return;
		}

		router.replace("/dashboard");
	}

	if (needsTwoFactor) {
		return (
			<AuthShell
				title="Verificação"
				subtitle="Enviamos um código de 6 dígitos para o seu e-mail. Digite abaixo para continuar."
			>
				<TextField
					label="Código de verificação"
					value={code}
					onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
					placeholder="000000"
					keyboardType="number-pad"
					autoFocus
				/>
				<Notice kind="error" message={error} />
				<Button
					label="Verificar"
					onPress={handleVerifyCode}
					loading={submitting}
					disabled={code.length !== 6}
				/>
			</AuthShell>
		);
	}

	return (
		<AuthShell
			title="Entrar"
			subtitle="Acesse sua conta para acompanhar suas finanças."
			footer={
				<>
					<Text className="text-subhead text-muted">Não tem uma conta?</Text>
					<Link href="/signup" className="text-subhead font-semibold text-fg">
						Criar conta
					</Link>
				</>
			}
		>
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
			<TextField
				label="Senha"
				value={password}
				onChangeText={setPassword}
				placeholder="Sua senha"
				autoComplete="current-password"
				secureTextEntry
			/>
			<Link href="/forgot-password" className="-mt-2 self-end text-footnote font-medium text-muted">
				Esqueci minha senha
			</Link>

			<Notice kind="error" message={error} />

			<Button label="Entrar" onPress={handleLogin} loading={submitting} disabled={!email || !password} />
			<Divider label="ou" />
			<GoogleButton label="Entrar com Google" onError={setError} />
		</AuthShell>
	);
}
