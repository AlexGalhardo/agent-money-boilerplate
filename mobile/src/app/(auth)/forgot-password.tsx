import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
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
		// redirectTo é um deep link (scheme "money") — o e-mail leva de volta pro
		// app, na tela de redefinir senha, com o token na URL (mesma lógica do
		// /esqueci-senha e /resetar-senha do frontend web).
		await requestPasswordReset({ email, redirectTo: "money://reset-password" });
		setSubmitting(false);
		setSent(true);
	}

	return (
		<SafeAreaView className="flex-1 bg-white">
			<KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
				<Animated.ScrollView
					entering={FadeInDown.duration(240)}
					contentContainerClassName="grow justify-center px-6 py-10"
					keyboardShouldPersistTaps="handled"
				>
					<Text className="text-3xl font-bold text-slate-900">Recuperar senha</Text>
					<Text className="mt-2 text-base text-slate-500">
						Enviaremos um link de redefinição para o seu e-mail.
					</Text>

					{sent ? (
						<Text className="mt-8 text-sm text-emerald-600">
							Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Abra o
							link pelo celular para voltar direto ao app.
						</Text>
					) : (
						<View className="mt-8 gap-4">
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
							{error ? <Text className="text-sm text-red-600">{error}</Text> : null}
							<Button label="Enviar link" onPress={onSubmit} loading={submitting} disabled={!email} />
						</View>
					)}

					<View className="mt-6 flex-row justify-center gap-1">
						<Text className="text-sm text-slate-500">Lembrou a senha?</Text>
						<Link href="/login" className="text-sm font-semibold text-blue-600">
							Entrar
						</Link>
					</View>
				</Animated.ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
