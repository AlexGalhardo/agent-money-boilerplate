import { Text } from "react-native";

import { Pressable } from "@/shared/components/atoms/pressable";

type Props = {
	label: string;
	selected: boolean;
	onPress: () => void;
};

export function Chip({ label, selected, onPress }: Props) {
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			style={{
				borderRadius: 999,
				borderWidth: 1,
				paddingHorizontal: 12,
				paddingVertical: 8,
				borderColor: selected ? "#2563eb" : "#cbd5e1",
				backgroundColor: selected ? "#2563eb" : "#ffffff",
			}}
		>
			<Text className={`text-sm font-medium ${selected ? "text-white" : "text-slate-700"}`}>{label}</Text>
		</Pressable>
	);
}
