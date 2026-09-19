import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/context/auth";
import { isValidEmail } from "@/lib/auth";

export default function SignUpScreen() {
	const router = useRouter();
	const { signUp } = useAuth();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async () => {
		setError(null);

		if (!isValidEmail(email)) {
			setError("Informe um e-mail válido.");
			return;
		}
		if (password.length < 6) {
			setError("A senha deve ter ao menos 6 caracteres.");
			return;
		}
		if (password !== confirm) {
			setError("As senhas não coincidem.");
			return;
		}

		setSubmitting(true);
		try {
			await signUp(email, password);
			router.replace("/dashboard");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Não foi possível criar a conta.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<SafeAreaView className="flex-1 bg-white">
			<KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
				<ScrollView
					contentContainerClassName="grow justify-center px-6 py-10"
					keyboardShouldPersistTaps="handled"
				>
					<Text className="text-3xl font-bold text-slate-900">Criar conta</Text>
					<Text className="mt-2 text-base text-slate-500">Cadastre-se com e-mail e senha para começar.</Text>

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
						<TextField
							label="Senha"
							value={password}
							onChangeText={setPassword}
							placeholder="Mínimo de 6 caracteres"
							secureTextEntry
						/>
						<TextField
							label="Confirmar senha"
							value={confirm}
							onChangeText={setConfirm}
							placeholder="Repita a senha"
							secureTextEntry
						/>

						{error ? <Text className="text-sm text-red-600">{error}</Text> : null}

						<Button
							label="Criar conta"
							onPress={onSubmit}
							loading={submitting}
							disabled={!email || !password || !confirm}
						/>
					</View>

					<View className="mt-6 flex-row justify-center gap-1">
						<Text className="text-sm text-slate-500">Já tem uma conta?</Text>
						<Link href="/login" className="text-sm font-semibold text-blue-600">
							Entrar
						</Link>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
