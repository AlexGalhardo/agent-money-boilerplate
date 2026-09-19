import { email as emailSchema } from "@op/shared";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { repos } from "@/data";

export default function ForgotPasswordScreen() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async () => {
		setError(null);
		setStatus(null);
		if (!emailSchema.safeParse(email).success) {
			setError("Informe um e-mail válido.");
			return;
		}
		setSubmitting(true);
		try {
			const res = await repos.auth.forgotPassword(email.trim().toLowerCase());
			setStatus("Se houver uma conta com este e-mail, enviamos instruções de redefinição.");
			// Dev convenience: backend returns the token outside production.
			if (res.devToken) {
				router.push({
					pathname: "/reset-password",
					params: { token: res.devToken },
				});
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : "Não foi possível enviar.");
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
					<Text className="text-3xl font-bold text-slate-900">Recuperar senha</Text>
					<Text className="mt-2 text-base text-slate-500">
						Enviaremos um link de redefinição para o seu e-mail.
					</Text>

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
						{status ? <Text className="text-sm text-emerald-600">{status}</Text> : null}
						<Button label="Enviar link" onPress={onSubmit} loading={submitting} disabled={!email} />
					</View>

					<View className="mt-6 flex-row justify-center gap-1">
						<Text className="text-sm text-slate-500">Lembrou a senha?</Text>
						<Link href="/login" className="text-sm font-semibold text-blue-600">
							Entrar
						</Link>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
