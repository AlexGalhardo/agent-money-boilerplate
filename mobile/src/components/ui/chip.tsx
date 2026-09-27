import { Pressable, Text } from "react-native";

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
			aria-selected={selected}
			className={`rounded-full px-4 py-2 active:opacity-70 ${selected ? "bg-primary" : "bg-raised"}`}
		>
			<Text className={`text-subhead font-medium ${selected ? "text-on-primary" : "text-muted"}`}>{label}</Text>
		</Pressable>
	);
}
