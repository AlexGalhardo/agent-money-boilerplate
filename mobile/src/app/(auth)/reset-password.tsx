import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { resetPassword } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";
import { isStrongPassword, PASSWORD_RULES } from "@/lib/password-rules";

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
			setError("Link inválido ou expirado. Solicite uma nova redefinição de senha.");
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
		<SafeAreaView className="flex-1 bg-white">
			<KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
				<ScrollView
					contentContainerClassName="grow justify-center px-6 py-10"
					keyboardShouldPersistTaps="handled"
				>
					<Text className="text-3xl font-bold text-slate-900">Nova senha</Text>
					<Text className="mt-2 text-base text-slate-500">Escolha uma nova senha para sua conta.</Text>

					<View className="mt-8 gap-4">
						{!token ? (
							<Text className="text-sm text-red-600">
								Link inválido ou expirado. Volte para "Esqueci minha senha" e solicite um novo.
							</Text>
						) : null}

						<TextField
							label="Nova senha"
							value={password}
							onChangeText={setPassword}
							placeholder="Crie uma nova senha forte"
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
						{done ? (
							<Text className="text-sm text-emerald-600">Senha redefinida. Redirecionando…</Text>
						) : null}

						<Button
							label="Redefinir senha"
							onPress={onSubmit}
							loading={submitting}
							disabled={!password || !token}
						/>
					</View>

					<View className="mt-6 flex-row justify-center gap-1">
						<Link href="/login" className="text-sm font-semibold text-blue-600">
							Voltar para o login
						</Link>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
