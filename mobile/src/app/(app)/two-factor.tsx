import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";

/**
 * 2FA do mobile é sempre por código enviado por e-mail (`method: "otp"`,
 * ver plugin twoFactor do better-auth) — diferente do TOTP/QR code do
 * frontend web, por decisão de produto (mesmo backend, método mais simples
 * de operar sem um app autenticador dedicado).
 */
export default function TwoFactorScreen() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const meQuery = useQuery({
		queryKey: ["me"],
		queryFn: async () => {
			const { data, error } = await api.users.me.get();
			if (error || !data || !("user" in data)) throw new Error("Falha ao carregar dados da conta");
			return data.user;
		},
	});

	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function refreshMe(): Promise<void> {
		await queryClient.invalidateQueries({ queryKey: ["me"] });
	}

	async function onEnable(): Promise<void> {
		setError(null);
		setLoading(true);
		const { error: enableError } = await authClient.twoFactor.enable({ password, method: "otp" });
		setLoading(false);

		if (enableError) {
			setError(translateAuthError(enableError, "Não foi possível ativar o 2FA"));
			return;
		}

		setPassword("");
		await refreshMe();
	}

	async function onDisable(): Promise<void> {
		setError(null);
		setLoading(true);
		const { error: disableError } = await authClient.twoFactor.disable({ password });
		setLoading(false);

		if (disableError) {
			setError(translateAuthError(disableError, "Não foi possível desativar o 2FA"));
			return;
		}

		setPassword("");
		await refreshMe();
	}

	const enabled = Boolean(meQuery.data?.twoFactorEnabled);

	return (
		<SafeAreaView className="flex-1 bg-white">
			<View className="flex-row items-center justify-between border-b border-slate-200 px-5 py-3">
				<Pressable onPress={() => router.back()} hitSlop={8}>
					<Text className="text-base font-medium text-blue-600">Voltar</Text>
				</Pressable>
				<Text className="text-base font-semibold text-slate-900">Verificação em duas etapas</Text>
				<View className="w-14" />
			</View>

			<KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
				<Animated.ScrollView
					entering={FadeInDown.duration(240)}
					contentContainerClassName="p-6 gap-4"
					keyboardShouldPersistTaps="handled"
				>
					{enabled ? (
						<>
							<Text className="text-sm text-emerald-600">
								A verificação em duas etapas está ativada para sua conta.
							</Text>
							<Text className="text-xs text-slate-500">
								A cada login, enviaremos um código de 6 dígitos para o seu e-mail.
							</Text>
							<TextField
								label="Confirme sua senha para desativar"
								value={password}
								onChangeText={setPassword}
								secureTextEntry
							/>
							{error ? <Text className="text-sm text-red-600">{error}</Text> : null}
							<Button
								label="Desativar 2FA"
								onPress={onDisable}
								loading={loading}
								variant="danger"
								disabled={!password}
							/>
						</>
					) : (
						<>
							<Text className="text-sm text-slate-500">
								Adicione uma camada extra de segurança: a cada login, enviaremos um código de 6 dígitos
								para o seu e-mail.
							</Text>
							<TextField
								label="Confirme sua senha"
								value={password}
								onChangeText={setPassword}
								secureTextEntry
							/>
							{error ? <Text className="text-sm text-red-600">{error}</Text> : null}
							<Button label="Ativar 2FA" onPress={onEnable} loading={loading} disabled={!password} />
						</>
					)}
				</Animated.ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
