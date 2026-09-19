import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/context/auth";

export default function AppLayout() {
	const { user, initializing } = useAuth();

	if (initializing) return null;
	if (!user) return <Redirect href="/login" />;

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="dashboard" />
			<Stack.Screen name="profile" options={{ presentation: "card" }} />
			<Stack.Screen name="subscription" options={{ presentation: "card" }} />
			<Stack.Screen name="two-factor" options={{ presentation: "card" }} />
			<Stack.Screen name="transaction/[id]" options={{ presentation: "modal" }} />
		</Stack>
	);
}
