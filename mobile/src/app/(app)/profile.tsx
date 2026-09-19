import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { api } from "@/lib/api";
import { authClient, useSession } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";
import { isStrongPassword } from "@/lib/password-rules";
import { hasActivePlan } from "@/lib/plan";

export default function ProfileScreen() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { data: session } = useSession();

	const meQuery = useQuery({
		queryKey: ["me"],
		queryFn: async () => {
			const { data, error } = await api.users.me.get();
			if (error || !data || !("user" in data)) throw new Error("Falha ao carregar dados da conta");
			return data.user;
		},
	});

	const [name, setName] = useState(session?.user.name ?? "");
	const [nameStatus, setNameStatus] = useState<string | null>(null);
	const [nameError, setNameError] = useState<string | null>(null);
	const [savingName, setSavingName] = useState(false);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [savingPassword, setSavingPassword] = useState(false);

	const [telegramChatId, setTelegramChatId] = useState("");
	const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
	const [telegramError, setTelegramError] = useState<string | null>(null);
	const [savingTelegram, setSavingTelegram] = useState(false);

	const [deleting, setDeleting] = useState(false);

	async function onSaveName(): Promise<void> {
		setNameStatus(null);
		setNameError(null);
		setSavingName(true);
		const { error } = await authClient.updateUser({ name });
		setSavingName(false);

		if (error) {
			setNameError(translateAuthError(error, "Não foi possível atualizar seu nome"));
			return;
		}
		setNameStatus("Nome atualizado.");
	}

	async function onChangePassword(): Promise<void> {
		setPasswordStatus(null);
		setPasswordError(null);

		if (!currentPassword || !isStrongPassword(newPassword)) {
			setPasswordError(
				"A nova senha não atende aos requisitos (8-32 caracteres, maiúscula, minúscula, número e símbolo).",
			);
			return;
		}

		setSavingPassword(true);
		const { error } = await authClient.changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: true,
		});
		setSavingPassword(false);

		if (error) {
			setPasswordError(translateAuthError(error, "Não foi possível alterar sua senha"));
			return;
		}

		setPasswordStatus("Senha alterada com sucesso.");
		setCurrentPassword("");
		setNewPassword("");
	}

	async function onSaveTelegram(): Promise<void> {
		setTelegramStatus(null);
		setTelegramError(null);
		setSavingTelegram(true);
		const { error } = await api.users.me.put({ telegramChatId: telegramChatId.trim() });
		setSavingTelegram(false);

		if (error) {
			setTelegramError("Não foi possível salvar o Chat ID do Telegram");
			return;
		}
		setTelegramStatus("Chat ID salvo.");
		await queryClient.invalidateQueries({ queryKey: ["me"] });
	}

	function onDeleteAccount(): void {
		if (meQuery.data && hasActivePlan(meQuery.data)) {
			Alert.alert("Plano ativo", "Cancele ou aguarde o vencimento do plano antes de excluir sua conta.");
			return;
		}

		Alert.alert(
			"Excluir conta",
			"Sua conta será marcada para exclusão. Você tem 30 dias para fazer login novamente e cancelar. Depois disso, a exclusão é definitiva.",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Excluir",
					style: "destructive",
					onPress: async () => {
						setDeleting(true);
						const { error } = await api.users.me.delete();
						setDeleting(false);
						if (error) {
							Alert.alert("Erro", "Não foi possível excluir sua conta");
							return;
						}
						await authClient.signOut();
						router.replace("/login");
					},
				},
			],
		);
	}

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
						<Text className="text-base font-medium text-slate-800">{session?.user.email}</Text>
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
								{meQuery.data?.twoFactorEnabled ? "Ativa" : "Configurar"}
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
							maxLength={16}
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
						<Button label="Salvar nome" onPress={onSaveName} loading={savingName} disabled={!name.trim()} />
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
							placeholder="Crie uma nova senha forte"
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

					<View className="gap-3">
						<Text className="text-sm font-semibold text-slate-700">Bot do Telegram</Text>
						<Text className="text-xs text-slate-500">
							ID da conta: <Text className="font-mono">{meQuery.data?.id}</Text> — envie esse ID pro bot
							quando ele pedir, ou informe o Chat ID manualmente aqui.
						</Text>
						<TextField
							label="Chat ID do Telegram"
							value={telegramChatId || meQuery.data?.telegramChatId || ""}
							onChangeText={setTelegramChatId}
							placeholder="Ex: 123456789"
							keyboardType="numbers-and-punctuation"
						/>
						{telegramError ? (
							<Animated.Text entering={FadeInUp.duration(160)} className="text-sm text-red-600">
								{telegramError}
							</Animated.Text>
						) : null}
						{telegramStatus ? (
							<Animated.Text entering={FadeInUp.duration(160)} className="text-sm text-emerald-600">
								{telegramStatus}
							</Animated.Text>
						) : null}
						<Button
							label="Salvar Chat ID"
							onPress={onSaveTelegram}
							loading={savingTelegram}
							variant="secondary"
						/>
					</View>

					<View className="gap-3 border-t border-red-200 pt-6">
						<Text className="text-sm font-semibold text-red-600">Excluir conta</Text>
						<Text className="text-xs text-slate-500">
							Essa ação remove todos os seus dados. Não é possível excluir com um plano ativo.
						</Text>
						<Button
							label="Excluir minha conta"
							onPress={onDeleteAccount}
							loading={deleting}
							variant="danger"
						/>
					</View>
				</Animated.ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
