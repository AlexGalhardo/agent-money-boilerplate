import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/context/auth";

export default function LoginScreen() {
	const router = useRouter();
	const { signIn } = useAuth();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [totp, setTotp] = useState("");
	const [needsTotp, setNeedsTotp] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async () => {
		setError(null);
		setSubmitting(true);
		try {
			const res = await signIn(email, password, needsTotp ? totp : undefined);
			if ("twoFactorRequired" in res) {
				setNeedsTotp(true);
				setError(null);
			} else {
				router.replace("/dashboard");
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : "Não foi possível entrar.");
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
					<Text className="text-3xl font-bold text-slate-900">Entrar</Text>
					<Text className="mt-2 text-base text-slate-500">
						Acesse sua conta para gerenciar suas finanças.
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
							editable={!needsTotp}
						/>
						<TextField
							label="Senha"
							value={password}
							onChangeText={setPassword}
							placeholder="Sua senha"
							secureTextEntry
							editable={!needsTotp}
						/>

						{needsTotp ? (
							<TextField
								label="Código de verificação"
								value={totp}
								onChangeText={setTotp}
								placeholder="123456"
								keyboardType="number-pad"
							/>
						) : null}

						{error ? <Text className="text-sm text-red-600">{error}</Text> : null}

						<Button
							label={needsTotp ? "Verificar" : "Entrar"}
							onPress={onSubmit}
							loading={submitting}
							disabled={needsTotp ? totp.length !== 6 : !email || !password}
						/>

						<View className="flex-row justify-center">
							<Link href="/forgot-password" className="text-sm font-semibold text-blue-600">
								Esqueci minha senha
							</Link>
						</View>
					</View>

					<View className="mt-6 flex-row justify-center gap-1">
						<Text className="text-sm text-slate-500">Não tem uma conta?</Text>
						<Link href="/signup" className="text-sm font-semibold text-blue-600">
							Criar conta
						</Link>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
