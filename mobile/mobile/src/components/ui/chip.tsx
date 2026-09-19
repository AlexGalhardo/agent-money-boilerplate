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
			className={`rounded-full border px-3 py-2 ${
				selected ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white active:bg-slate-100"
			}`}
		>
			<Text className={`text-sm font-medium ${selected ? "text-white" : "text-slate-700"}`}>{label}</Text>
		</Pressable>
	);
}
