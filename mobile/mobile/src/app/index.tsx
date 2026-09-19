import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/context/auth";

export default function Index() {
	const { user, initializing } = useAuth();

	if (initializing) {
		return (
			<View className="flex-1 items-center justify-center bg-white">
				<ActivityIndicator />
			</View>
		);
	}

	return <Redirect href={user ? "/dashboard" : "/login"} />;
}
