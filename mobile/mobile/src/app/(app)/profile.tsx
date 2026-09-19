import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Switch, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/context/auth";
import { isBiometricEnabled, setBiometricEnabled } from "@/lib/auth";

const BIOMETRICS_ENABLED = false;

async function runBiometricAuthentication(): Promise<boolean> {
	const hasHardware = await LocalAuthentication.hasHardwareAsync();
	const isEnrolled = await LocalAuthentication.isEnrolledAsync();
	if (!hasHardware || !isEnrolled) {
		throw new Error("Nenhuma biometria cadastrada neste dispositivo.");
	}
	const result = await LocalAuthentication.authenticateAsync({
		promptMessage: "Confirme sua identidade",
		cancelLabel: "Cancelar",
		fallbackLabel: "Usar senha do dispositivo",
		disableDeviceFallback: false,
	});
	return result.success;
}

export default function ProfileScreen() {
	const router = useRouter();
	const { user, updateName, changePassword } = useAuth();

	const [name, setName] = useState(user?.name ?? "");
	const [nameStatus, setNameStatus] = useState<string | null>(null);
	const [nameError, setNameError] = useState<string | null>(null);
	const [savingName, setSavingName] = useState(false);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [savingPassword, setSavingPassword] = useState(false);

	const [biometricOn, setBiometricOn] = useState(false);

	useEffect(() => {
		if (!user) return;
		isBiometricEnabled(Number(user.id))
			.then(setBiometricOn)
			.catch(() => undefined);
	}, [user]);

	const onSaveName = async () => {
		setNameStatus(null);
		setNameError(null);
		setSavingName(true);
		try {
			await updateName(name);
			setNameStatus("Nome atualizado.");
		} catch (e) {
			setNameError(e instanceof Error ? e.message : "Não foi possível salvar.");
		} finally {
			setSavingName(false);
		}
	};

	const onChangePassword = async () => {
		setPasswordStatus(null);
		setPasswordError(null);

		if (!currentPassword || !newPassword || !confirmPassword) {
			setPasswordError("Preencha todos os campos de senha.");
			return;
		}
		if (newPassword.length < 6) {
			setPasswordError("A nova senha deve ter ao menos 6 caracteres.");
			return;
		}
		if (newPassword !== confirmPassword) {
			setPasswordError("A confirmação não coincide com a nova senha.");
			return;
		}

		setSavingPassword(true);
		try {
			await changePassword(currentPassword, newPassword);
			setPasswordStatus("Senha alterada com sucesso.");
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (e) {
			setPasswordError(e instanceof Error ? e.message : "Não foi possível alterar a senha.");
		} finally {
			setSavingPassword(false);
		}
	};

	const onToggleBiometric = async (next: boolean) => {
		if (!user) return;

		// Ative removendo o comentário abaixo após trocar BIOMETRICS_ENABLED para true e gerar um build de desenvolvimento.
		// const passed = next ? await runBiometricAuthentication() : true;
		const passed = !next;
		void runBiometricAuthentication;

		if (next && !passed) return;

		setBiometricOn(next);
		await setBiometricEnabled(Number(user.id), next);
	};

	return (
		<SafeAreaView className="flex-1 bg-white">
			<View className="flex-row items-center justify-between border-b border-slate-200 px-5 py-3">
				<Pressable onPress={() => router.back()} hitSlop={8}>
					<Text className="text-base font-medium text-blue-600">Voltar</Text>
				</Pressable>
				<Text className="text-base font-semibold text-slate-900">Perfil</Text>
				<View className="w-14" />
			</View>

			<KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
				<Animated.ScrollView
					entering={FadeInDown.duration(240)}
					contentContainerClassName="p-6 gap-8"
					keyboardShouldPersistTaps="handled"
				>
					<View className="gap-1">
						<Text className="text-xs uppercase tracking-wide text-slate-400">E-mail</Text>
						<Text className="text-base font-medium text-slate-800">{user?.email}</Text>
					</View>

					<View className="gap-2">
						<Pressable
							onPress={() => router.push("/subscription")}
							className="flex-row items-center justify-between rounded-xl border border-slate-200 p-4 active:bg-slate-50"
						>
							<Text className="text-base font-medium text-slate-800">Assinatura</Text>
							<Text className="text-sm text-blue-600">Gerenciar</Text>
						</Pressable>
						<Pressable
							onPress={() => router.push("/two-factor")}
							className="flex-row items-center justify-between rounded-xl border border-slate-200 p-4 active:bg-slate-50"
						>
							<Text className="text-base font-medium text-slate-800">Verificação em duas etapas</Text>
							<Text className="text-sm text-blue-600">
								{user?.twoFactorEnabled ? "Ativa" : "Configurar"}
							</Text>
						</Pressable>
					</View>

					<View className="gap-3">
						<Text className="text-sm font-semibold text-slate-700">Nome de exibição</Text>
						<TextField
							label="Nome"
							value={name}
							onChangeText={setName}
							placeholder="Como devemos te chamar?"
						/>
						{nameError ? (
							<Animated.Text entering={FadeInUp.duration(160)} className="text-sm text-red-600">
								{nameError}
							</Animated.Text>
						) : null}
						{nameStatus ? (
							<Animated.Text entering={FadeInUp.duration(160)} className="text-sm text-emerald-600">
								{nameStatus}
							</Animated.Text>
						) : null}
						<Button
							label="Salvar nome"
							onPress={onSaveName}
							loading={savingName}
							disabled={!name.trim() || name.trim() === user?.name}
						/>
					</View>

					<View className="gap-3">
						<Text className="text-sm font-semibold text-slate-700">Alterar senha</Text>
						<TextField
							label="Senha atual"
							value={currentPassword}
							onChangeText={setCurrentPassword}
							placeholder="Sua senha atual"
							secureTextEntry
						/>
						<TextField
							label="Nova senha"
							value={newPassword}
							onChangeText={setNewPassword}
							placeholder="Mínimo de 6 caracteres"
							secureTextEntry
						/>
						<TextField
							label="Confirmar nova senha"
							value={confirmPassword}
							onChangeText={setConfirmPassword}
							placeholder="Repita a nova senha"
							secureTextEntry
						/>
						{passwordError ? (
							<Animated.Text entering={FadeInUp.duration(160)} className="text-sm text-red-600">
								{passwordError}
							</Animated.Text>
						) : null}
						{passwordStatus ? (
							<Animated.Text entering={FadeInUp.duration(160)} className="text-sm text-emerald-600">
								{passwordStatus}
							</Animated.Text>
						) : null}
						<Button label="Alterar senha" onPress={onChangePassword} loading={savingPassword} />
					</View>

					<View className="gap-2">
						<Text className="text-sm font-semibold text-slate-700">Segurança</Text>
						<View
							className={`flex-row items-center justify-between rounded-xl border border-slate-200 p-4 ${
								BIOMETRICS_ENABLED ? "bg-white" : "bg-slate-50 opacity-60"
							}`}
						>
							<View className="flex-1 pr-3">
								<Text className="text-base font-medium text-slate-800">Usar biometria para entrar</Text>
								<Text className="mt-0.5 text-xs text-slate-500">
									Face ID, Touch ID ou digital do aparelho
								</Text>
							</View>
							<Switch
								value={biometricOn}
								onValueChange={onToggleBiometric}
								disabled={!BIOMETRICS_ENABLED}
							/>
						</View>
						<Text className="text-xs text-slate-400">Recurso desativado neste protótipo.</Text>
					</View>
				</Animated.ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
