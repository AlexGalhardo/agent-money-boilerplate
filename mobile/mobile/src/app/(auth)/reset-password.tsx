import { password as passwordSchema } from "@op/shared";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { repos } from "@/data";

export default function ResetPasswordScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ token?: string }>();
	const [token, setToken] = useState(params.token ?? "");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async () => {
		setError(null);
		if (!token.trim()) {
			setError("Informe o código recebido por e-mail.");
			return;
		}
		if (!passwordSchema.safeParse(password).success) {
			setError("A senha deve ter ao menos 6 caracteres.");
			return;
		}
		if (password !== confirm) {
			setError("As senhas não coincidem.");
			return;
		}
		setSubmitting(true);
		try {
			await repos.auth.resetPassword(token.trim(), password);
			setDone(true);
			setTimeout(() => router.replace("/login"), 1200);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Não foi possível redefinir.");
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
					<Text className="text-3xl font-bold text-slate-900">Nova senha</Text>
					<Text className="mt-2 text-base text-slate-500">
						Cole o código do e-mail e escolha uma nova senha.
					</Text>

					<View className="mt-8 gap-4">
						<TextField
							label="Código"
							value={token}
							onChangeText={setToken}
							placeholder="Código recebido por e-mail"
							autoCapitalize="none"
							autoCorrect={false}
						/>
						<TextField
							label="Nova senha"
							value={password}
							onChangeText={setPassword}
							placeholder="Mínimo de 6 caracteres"
							secureTextEntry
						/>
						<TextField
							label="Confirmar nova senha"
							value={confirm}
							onChangeText={setConfirm}
							placeholder="Repita a nova senha"
							secureTextEntry
						/>
						{error ? <Text className="text-sm text-red-600">{error}</Text> : null}
						{done ? (
							<Text className="text-sm text-emerald-600">Senha redefinida. Redirecionando…</Text>
						) : null}
						<Button
							label="Redefinir senha"
							onPress={onSubmit}
							loading={submitting}
							disabled={!password || !confirm}
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
