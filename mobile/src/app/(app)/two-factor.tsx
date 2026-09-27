import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";
import { useMeQuery, useRefreshMe } from "@/query/me";
import { colors } from "@/theme";

/**
 * Mobile 2FA is always an e-mailed code (`method: "otp"` in better-auth's
 * twoFactor plugin) — unlike the web's TOTP/QR flow, by product decision:
 * same backend, simpler to operate without an authenticator app.
 */
export default function TwoFactorScreen() {
	const meQuery = useMeQuery();
	const refreshMe = useRefreshMe();

	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const enabled = Boolean(meQuery.data?.twoFactorEnabled);

	async function onToggle(): Promise<void> {
		setError(null);
		setLoading(true);
		const { error: requestError } = enabled
			? await authClient.twoFactor.disable({ password })
			: await authClient.twoFactor.enable({ password, method: "otp" });
		setLoading(false);

		if (requestError) {
			setError(
				translateAuthError(
					requestError,
					enabled ? "Não foi possível desativar o 2FA" : "Não foi possível ativar o 2FA",
				),
			);
			return;
		}

		setPassword("");
		await refreshMe();
	}

	return (
		<Screen scroll edges={["left", "right", "bottom"]} contentClassName="gap-6">
			<View className="flex-row items-center gap-4 rounded-card bg-surface p-5">
				<View
					className={`size-11 items-center justify-center rounded-full ${enabled ? "bg-income/15" : "bg-raised"}`}
				>
					<Feather
						name={enabled ? "shield" : "shield-off"}
						size={20}
						color={enabled ? colors.income : colors.muted}
					/>
				</View>
				<View className="flex-1">
					<Text className="text-headline text-fg">{enabled ? "Ativada" : "Desativada"}</Text>
					<Text className="mt-0.5 text-footnote text-muted">
						A cada login, enviamos um código de 6 dígitos para o seu e-mail.
					</Text>
				</View>
			</View>

			<TextField
				label={enabled ? "Confirme sua senha para desativar" : "Confirme sua senha"}
				value={password}
				onChangeText={setPassword}
				autoComplete="current-password"
				secureTextEntry
			/>
			<Notice kind="error" message={error} />
			<Button
				label={enabled ? "Desativar 2FA" : "Ativar 2FA"}
				variant={enabled ? "danger" : "primary"}
				onPress={onToggle}
				loading={loading}
				disabled={!password}
			/>
		</Screen>
	);
}
