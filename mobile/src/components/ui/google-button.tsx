import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator } from "react-native";
import { authClient } from "@/lib/auth-client";
import { translateAuthError } from "@/lib/auth-errors";
import { SocialButton } from "@/shared/components/pieces/social-button";

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
		<SocialButton.Root
			provider="google"
			variant="outline"
			fullWidth
			onPress={handlePress}
			disabled={loading}
			accessibilityLabel={label}
		>
			{loading ? (
				<ActivityIndicator color="#0f172a" />
			) : (
				<>
					<SocialButton.Icon />
					<SocialButton.Label>{label}</SocialButton.Label>
				</>
			)}
		</SocialButton.Root>
	);
}
