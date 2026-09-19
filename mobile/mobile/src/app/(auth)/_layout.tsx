import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/context/auth";

export default function AuthLayout() {
	const { user, initializing } = useAuth();

	if (initializing) return null;
	if (user) return <Redirect href="/dashboard" />;

	return <Stack screenOptions={{ headerShown: false }} />;
}
