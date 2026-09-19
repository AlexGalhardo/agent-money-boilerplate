import type { TwoFactorEnableResponse, TwoFactorSetupResponse } from "@op/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { isRemote } from "@/config/env";
import { useAuth } from "@/context/auth";

export default function TwoFactorScreen() {
	const router = useRouter();
	const { user, refreshUser } = useAuth();
	const enabled = user?.twoFactorEnabled ?? false;

	const [setup, setSetup] = useState<TwoFactorSetupResponse | null>(null);
	const [code, setCode] = useState("");
	const [recovery, setRecovery] = useState<string[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const startSetup = async () => {
		setError(null);
		setBusy(true);
		try {
			setSetup(await apiClient.post<TwoFactorSetupResponse>("/2fa/setup"));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Falha ao iniciar.");
		} finally {
			setBusy(false);
		}
	};

	const enable = async () => {
		setError(null);
		setBusy(true);
		try {
			const res = await apiClient.post<TwoFactorEnableResponse>("/2fa/enable", {
				code,
			});
			setRecovery(res.recoveryCodes);
			setCode("");
			await refreshUser();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Código inválido.");
		} finally {
			setBusy(false);
		}
	};

	const disable = async () => {
		setError(null);
		setBusy(true);
		try {
			await apiClient.post("/2fa/disable", { code });
			setCode("");
			await refreshUser();
			router.back();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Código inválido.");
		} finally {
			setBusy(false);
		}
	};

	return (
		<SafeAreaView className="flex-1 bg-white">
			<View className="flex-row items-center justify-between border-b border-slate-200 px-5 py-3">
				<Pressable onPress={() => router.back()} hitSlop={8}>
					<Text className="text-base font-medium text-blue-600">Voltar</Text>
				</Pressable>
				<Text className="text-base font-semibold text-slate-900">Verificação em duas etapas</Text>
				<View className="w-14" />
			</View>

			<View className="flex-1 gap-5 p-6">
				{!isRemote ? (
					<Text className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
						A verificação em duas etapas exige o modo online (EXPO_PUBLIC_DATA_MODE=remote).
					</Text>
				) : busy && !setup && !enabled ? (
					<ActivityIndicator />
				) : enabled ? (
					<>
						<Text className="text-sm text-slate-600">
							A verificação em duas etapas está <Text className="font-semibold">ativa</Text>. Para
							desativar, informe um código do app autenticador ou um código de recuperação.
						</Text>
						<TextField
							label="Código"
							value={code}
							onChangeText={setCode}
							placeholder="123456 ou XXXX-XXXX"
							autoCapitalize="characters"
						/>
						{error ? <Text className="text-sm text-red-600">{error}</Text> : null}
						<Button
							label="Desativar 2FA"
							variant="danger"
							loading={busy}
							onPress={disable}
							disabled={!code}
						/>
					</>
				) : recovery ? (
					<>
						<Text className="text-sm font-semibold text-emerald-600">
							2FA ativada! Guarde estes códigos de recuperação em local seguro — cada um funciona uma
							única vez.
						</Text>
						<View className="rounded-xl border border-slate-200 bg-slate-50 p-4">
							{recovery.map((c) => (
								<Text key={c} selectable className="py-0.5 font-mono text-base text-slate-800">
									{c}
								</Text>
							))}
						</View>
						<Button label="Concluir" onPress={() => router.back()} />
					</>
				) : setup ? (
					<>
						<Text className="text-sm text-slate-600">
							Adicione esta chave ao seu app autenticador (Google Authenticator, 1Password, etc.) e
							informe o código gerado.
						</Text>
						<View className="rounded-xl border border-slate-200 bg-slate-50 p-4">
							<Text className="text-xs uppercase text-slate-400">Chave</Text>
							<Text selectable className="mt-1 font-mono text-base text-slate-800">
								{setup.secret}
							</Text>
							<Text selectable className="mt-3 text-xs text-slate-400">
								{setup.otpauthUrl}
							</Text>
						</View>
						<TextField
							label="Código de 6 dígitos"
							value={code}
							onChangeText={setCode}
							placeholder="123456"
							keyboardType="number-pad"
						/>
						{error ? <Text className="text-sm text-red-600">{error}</Text> : null}
						<Button label="Ativar 2FA" loading={busy} onPress={enable} disabled={code.length !== 6} />
					</>
				) : (
					<>
						<Text className="text-sm text-slate-600">
							Adicione uma camada extra de segurança exigindo um código do seu app autenticador a cada
							login.
						</Text>
						{error ? <Text className="text-sm text-red-600">{error}</Text> : null}
						<Button label="Configurar 2FA" loading={busy} onPress={startSetup} />
					</>
				)}
			</View>
		</SafeAreaView>
	);
}
