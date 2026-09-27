import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useSession } from "@/lib/auth-client";
import { colors } from "@/theme";

export default function Index() {
	const { data: session, isPending } = useSession();

	if (isPending) {
		return (
			<View className="flex-1 items-center justify-center bg-canvas">
				<ActivityIndicator color={colors.muted} />
			</View>
		);
	}

	return <Redirect href={session ? "/dashboard" : "/login"} />;
}
