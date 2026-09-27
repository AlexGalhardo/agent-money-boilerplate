import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme";

type Tab = "home" | "search" | "import" | "profile";

function NavItem({
	label,
	icon,
	active,
	accessibilityLabel,
	onPress,
	testID,
}: {
	label: string;
	icon: ComponentProps<typeof Feather>["name"];
	active: boolean;
	accessibilityLabel: string;
	onPress: () => void;
	testID: string;
}) {
	return (
		<Pressable
			onPress={onPress}
			testID={testID}
			accessibilityRole="tab"
			accessibilityLabel={accessibilityLabel}
			aria-selected={active}
			className="flex-1 items-center gap-1 py-2 active:opacity-60"
		>
			<Feather name={icon} size={21} color={active ? colors.fg : colors.subtle} />
			<Text className={`text-caption font-medium ${active ? "text-fg" : "text-subtle"}`}>{label}</Text>
		</Pressable>
	);
}

/**
 * Flat bottom bar shared by the main screens, with the primary "new
 * transaction" action in the middle. The `nav-*` testIDs are Maestro
 * selectors (mobile/maestro/*.yaml) — keep them stable.
 */
export function BottomNav({ active }: { active: Tab }) {
	const router = useRouter();
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-row items-center border-t border-line bg-canvas px-4 pt-1"
			style={{ paddingBottom: Math.max(insets.bottom, 8) }}
		>
			<NavItem
				label="Início"
				icon="home"
				active={active === "home"}
				accessibilityLabel="Início"
				testID="nav-home"
				onPress={() => router.replace("/dashboard")}
			/>
			<NavItem
				label="Buscar"
				icon="search"
				active={active === "search"}
				accessibilityLabel="Buscar transações"
				testID="nav-search"
				onPress={() => router.push("/search")}
			/>
			<View className="flex-1 items-center">
				<Pressable
					onPress={() => router.push("/transaction/new")}
					accessibilityRole="button"
					accessibilityLabel="Nova transação"
					testID="nav-new-transaction"
					className="size-12 items-center justify-center rounded-full bg-primary active:opacity-70"
				>
					<Feather name="plus" size={22} color={colors["on-primary"]} />
				</Pressable>
			</View>
			<NavItem
				label="Importar"
				icon="upload"
				active={active === "import"}
				accessibilityLabel="Importar extrato Nubank"
				testID="nav-import"
				onPress={() => router.push("/import-nubank")}
			/>
			<NavItem
				label="Conta"
				icon="user"
				active={active === "profile"}
				accessibilityLabel="Minha conta"
				testID="nav-profile"
				onPress={() => router.push("/profile")}
			/>
		</View>
	);
}
