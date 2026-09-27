import { Redirect, Stack } from "expo-router";

import { useSession } from "@/lib/auth-client";
import { colors } from "@/theme";

export default function AppLayout() {
	const { data: session, isPending } = useSession();

	if (isPending) return null;
	if (!session) return <Redirect href="/login" />;

	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: colors.canvas },
				headerTintColor: colors.fg,
				headerTitleStyle: { fontWeight: "600" },
				headerShadowVisible: false,
				headerBackButtonDisplayMode: "minimal",
				contentStyle: { backgroundColor: colors.canvas },
			}}
		>
			<Stack.Screen name="dashboard" options={{ headerShown: false }} />
			<Stack.Screen name="search" options={{ title: "Buscar" }} />
			<Stack.Screen name="profile" options={{ title: "Minha Conta" }} />
			<Stack.Screen name="subscription" options={{ title: "Assinatura" }} />
			<Stack.Screen name="two-factor" options={{ title: "Verificação em duas etapas" }} />
			<Stack.Screen name="import-nubank" options={{ title: "Importar do Nubank", presentation: "modal" }} />
			<Stack.Screen name="transaction/[id]" options={{ presentation: "modal" }} />
		</Stack>
	);
}
