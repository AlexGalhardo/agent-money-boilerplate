import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/ui/google-button";
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
			if (signInError.code === "EMAIL_NOT_VERIFIED") {
				setError("Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.");
				return;
			}
			setError(translateAuthError(signInError, "E-mail e/ou senha incorretos"));
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

	return (
		<SafeAreaView className="flex-1 bg-white">
			<KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
				<ScrollView
					contentContainerClassName="grow justify-center px-6 py-10"
					keyboardShouldPersistTaps="handled"
				>
					<Text className="text-3xl font-bold text-slate-900">Entrar</Text>
					<Text className="mt-2 text-base text-slate-500">
						Acesse sua conta para gerenciar suas finanças.
					</Text>

					<View className="mt-8 gap-4">
						{needsTwoFactor ? (
							<>
								<Text className="text-sm text-slate-500">
									Enviamos um código de 6 dígitos para o seu e-mail. Digite abaixo para continuar.
								</Text>
								<TextField
									label="Código de verificação"
									value={code}
									onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
									placeholder="123456"
									keyboardType="number-pad"
								/>
								{error ? <Text className="text-sm text-red-600">{error}</Text> : null}
								<Button
									label="Verificar"
									onPress={handleVerifyCode}
									loading={submitting}
									disabled={code.length !== 6}
								/>
							</>
						) : (
							<>
								<TextField
									label="E-mail"
									value={email}
									onChangeText={setEmail}
									placeholder="voce@exemplo.com"
									autoCapitalize="none"
									autoCorrect={false}
									keyboardType="email-address"
									inputMode="email"
								/>
								<TextField
									label="Senha"
									value={password}
									onChangeText={setPassword}
									placeholder="Sua senha"
									secureTextEntry
								/>

								{error ? <Text className="text-sm text-red-600">{error}</Text> : null}

								<Button
									label="Entrar"
									onPress={handleLogin}
									loading={submitting}
									disabled={!email || !password}
								/>

								<View className="flex-row items-center gap-3">
									<View className="h-px flex-1 bg-slate-200" />
									<Text className="text-xs text-slate-400">ou</Text>
									<View className="h-px flex-1 bg-slate-200" />
								</View>

								<GoogleButton label="Entrar com Google" onError={setError} />

								<View className="flex-row justify-center">
									<Link href="/forgot-password" className="text-sm font-semibold text-blue-600">
										Esqueci minha senha
									</Link>
								</View>
							</>
						)}
					</View>

					{!needsTwoFactor ? (
						<View className="mt-6 flex-row justify-center gap-1">
							<Text className="text-sm text-slate-500">Não tem uma conta?</Text>
							<Link href="/signup" className="text-sm font-semibold text-blue-600">
								Criar conta
							</Link>
						</View>
					) : null}
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
