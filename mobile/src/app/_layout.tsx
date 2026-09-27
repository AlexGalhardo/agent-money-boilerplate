import "@/global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { queryClient } from "@/query/client";
import { colors } from "@/theme";

export default function RootLayout() {
	return (
		<GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
			<SafeAreaProvider>
				<QueryClientProvider client={queryClient}>
					<StatusBar style="light" />
					<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
				</QueryClientProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
