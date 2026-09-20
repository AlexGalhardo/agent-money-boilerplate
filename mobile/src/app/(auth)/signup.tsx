import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/ui/google-button";
import { TextField } from "@/components/ui/text-field";
import { signUp } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";
import { isStrongPassword, PASSWORD_RULES } from "@/lib/password-rules";

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
			<SafeAreaView className="flex-1 bg-white">
				<View className="flex-1 justify-center px-6 py-10">
					<Text className="text-2xl font-bold text-slate-900">Confirme seu e-mail</Text>
					<Text className="mt-3 text-base text-slate-500">
						Enviamos um link de confirmação para {pendingVerificationEmail}. Confirme antes de acessar sua
						conta.
					</Text>
					<Link href="/login" className="mt-6 text-center text-sm font-semibold text-blue-600">
						Voltar para o login
					</Link>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-white">
			<KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
				<Animated.ScrollView
					entering={FadeInDown.duration(240)}
					contentContainerClassName="grow justify-center px-6 py-10"
					keyboardShouldPersistTaps="handled"
				>
					<Text className="text-3xl font-bold text-slate-900">Criar conta</Text>
					<Text className="mt-2 text-base text-slate-500">Leva menos de um minuto.</Text>

					<View className="mt-8 gap-4">
						<GoogleButton label="Criar conta com Google" onError={setError} />

						<View className="flex-row items-center gap-3">
							<View className="h-px flex-1 bg-slate-200" />
							<Text className="text-xs text-slate-400">ou</Text>
							<View className="h-px flex-1 bg-slate-200" />
						</View>

						<TextField
							label="Nome"
							value={name}
							onChangeText={(value) => setName(capitalizeFirstLetter(value))}
							placeholder="Digite seu nome"
							maxLength={16}
							autoCapitalize="words"
						/>
						<TextField
							label="E-mail"
							value={email}
							onChangeText={setEmail}
							placeholder="voce@exemplo.com"
							autoCapitalize="none"
							autoCorrect={false}
							keyboardType="email-address"
							inputMode="email"
							maxLength={48}
						/>
						<TextField
							label="Senha"
							value={password}
							onChangeText={setPassword}
							placeholder="Crie uma senha forte"
							secureTextEntry
						/>

						{password.length > 0 ? (
							<View className="gap-1">
								{PASSWORD_RULES.map((rule) => {
									const ok = rule.test(password);
									return (
										<Text
											key={rule.key}
											className={`text-xs ${ok ? "text-emerald-600" : "text-red-500"}`}
										>
											{ok ? "✓" : "✗"} {rule.label}
										</Text>
									);
								})}
							</View>
						) : null}

						{error ? <Text className="text-sm text-red-600">{error}</Text> : null}

						<Button
							label="Criar conta"
							onPress={onSubmit}
							loading={submitting}
							disabled={!name || !email || !password}
						/>
					</View>

					<View className="mt-6 flex-row justify-center gap-1">
						<Text className="text-sm text-slate-500">Já tem uma conta?</Text>
						<Link href="/login" className="text-sm font-semibold text-blue-600">
							Entrar
						</Link>
					</View>
				</Animated.ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
