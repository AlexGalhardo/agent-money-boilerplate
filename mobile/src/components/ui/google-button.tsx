import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

import { authClient } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";

export function GoogleButton({ label, onError }: { label: string; onError: (message: string) => void }) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	async function handlePress(): Promise<void> {
		setLoading(true);
		// Path relativo: o plugin do Expo converte pra deep link (money://dashboard)
		// automaticamente via Linking.createURL — ver docs/integrations/expo do
		// better-auth. Navegação não é automática depois do OAuth, por isso o
		// router.replace explícito abaixo.
		const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
		setLoading(false);

		if (error) {
			onError(translateAuthError(error, "Não foi possível entrar com Google"));
			return;
		}

		router.replace("/dashboard");
	}

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={handlePress}
			disabled={loading}
			className={`h-12 flex-row items-center justify-center rounded-xl border border-slate-300 bg-white ${loading ? "opacity-50" : "active:bg-slate-100"}`}
		>
			{loading ? (
				<ActivityIndicator color="#0f172a" />
			) : (
				<Text className="text-base font-semibold text-slate-900">{label}</Text>
			)}
		</Pressable>
	);
}
