import "@/global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAppColorScheme, useApplyStoredTheme } from "@/lib/theme";
import { queryClient } from "@/query/client";

export default function RootLayout() {
	useApplyStoredTheme();
	const { isDark } = useAppColorScheme();

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<QueryClientProvider client={queryClient}>
					<StatusBar style={isDark ? "light" : "dark"} />
					<Stack screenOptions={{ headerShown: false }} />
				</QueryClientProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
