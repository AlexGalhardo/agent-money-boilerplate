import { Redirect, Stack } from "expo-router";

import { useSession } from "@/lib/auth-client";

export default function AppLayout() {
	const { data: session, isPending } = useSession();

	if (isPending) return null;
	if (!session) return <Redirect href="/login" />;

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="dashboard" />
			<Stack.Screen name="search" options={{ presentation: "card" }} />
			<Stack.Screen name="profile" options={{ presentation: "card" }} />
			<Stack.Screen name="subscription" options={{ presentation: "card" }} />
			<Stack.Screen name="two-factor" options={{ presentation: "card" }} />
			<Stack.Screen name="import-nubank" options={{ presentation: "modal" }} />
			<Stack.Screen name="transaction/[id]" options={{ presentation: "modal" }} />
		</Stack>
	);
}
