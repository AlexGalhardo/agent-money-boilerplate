import { Text } from "react-native";

import { useAppColorScheme } from "@/lib/theme";
import { Pressable } from "@/shared/components/atoms/pressable";

type Props = {
	label: string;
	selected: boolean;
	onPress: () => void;
};

export function Chip({ label, selected, onPress }: Props) {
	const { isDark } = useAppColorScheme();
	const unselectedBorder = isDark ? "#475569" : "#cbd5e1";
	const unselectedBg = isDark ? "#1e293b" : "#ffffff";

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			style={{
				borderRadius: 999,
				borderWidth: 1,
				paddingHorizontal: 12,
				paddingVertical: 8,
				borderColor: selected ? "#2563eb" : unselectedBorder,
				backgroundColor: selected ? "#2563eb" : unselectedBg,
			}}
		>
			<Text className={`text-sm font-medium ${selected ? "text-white" : "text-slate-700 dark:text-slate-200"}`}>
				{label}
			</Text>
		</Pressable>
	);
}
