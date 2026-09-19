import "@/global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { queryClient } from "@/query/client";

export default function RootLayout() {
	return (
		<SafeAreaProvider>
			<QueryClientProvider client={queryClient}>
				<StatusBar style="dark" />
				<Stack screenOptions={{ headerShown: false }} />
			</QueryClientProvider>
		</SafeAreaProvider>
	);
}
