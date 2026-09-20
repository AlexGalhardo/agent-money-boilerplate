import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { useAppColorScheme } from "@/lib/theme";
import { Pressable } from "@/shared/components/atoms/pressable";

/**
 * Persistent bottom navigation shared by the main app screens (dashboard,
 * search, minha-conta) - see the WIREFRAME-*.png mockups this was built
 * from. Not an Expo Router tab navigator on purpose: only the center "+"
 * button and the two side icons are shared chrome, everything else about
 * each screen (headers, lists, forms) stays screen-owned, same as before
 * this redesign.
 */
export function BottomNav({ active }: { active: "search" | "add" | "profile" | null }) {
	const router = useRouter();
	const { isDark } = useAppColorScheme();

	const sideIconColor = (isActive: boolean) => (isActive ? "#2563eb" : isDark ? "#94a3b8" : "#64748b");
	const sideBg = isDark ? "#1e293b" : "#f1f5f9";

	return (
		<View
			className="absolute inset-x-0 bottom-0 flex-row items-center justify-between border-t border-slate-200 bg-slate-50 px-8 pb-8 pt-3 dark:border-slate-800 dark:bg-slate-950"
			pointerEvents="box-none"
		>
			<Pressable
				accessibilityLabel="Buscar transações"
				onPress={() => router.push("/search")}
				hitSlop={8}
				style={{
					width: 52,
					height: 52,
					borderRadius: 26,
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: sideBg,
				}}
			>
				<Feather name="search" size={22} color={sideIconColor(active === "search")} />
			</Pressable>

			<Pressable
				accessibilityLabel="Nova transação"
				onPress={() => router.push("/transaction/new")}
				hitSlop={8}
				style={{
					width: 60,
					height: 60,
					borderRadius: 30,
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: isDark ? "#f1f5f9" : "#0f172a",
				}}
			>
				<Feather name="plus" size={26} color={isDark ? "#0f172a" : "#ffffff"} />
			</Pressable>

			<Pressable
				accessibilityLabel="Minha conta"
				onPress={() => router.push("/profile")}
				hitSlop={8}
				style={{
					width: 52,
					height: 52,
					borderRadius: 26,
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: sideBg,
				}}
			>
				<Feather name="user" size={22} color={sideIconColor(active === "profile")} />
			</Pressable>
		</View>
	);
}
