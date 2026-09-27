import { Pressable, Text, View } from "react-native";

type Option<T extends string> = { value: T; label: string; activeClassName?: string };

type Props<T extends string> = {
	options: readonly Option<T>[];
	value: T;
	onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
	return (
		<View className="flex-row rounded-control bg-raised p-1" accessibilityRole="tablist">
			{options.map((option) => {
				const selected = option.value === value;
				return (
					<Pressable
						key={option.value}
						onPress={() => onChange(option.value)}
						accessibilityRole="tab"
						aria-selected={selected}
						className={`h-10 flex-1 items-center justify-center rounded-[10px] active:opacity-70 ${selected ? "bg-surface" : ""}`}
					>
						<Text
							className={`text-subhead font-semibold ${selected ? (option.activeClassName ?? "text-fg") : "text-subtle"}`}
						>
							{option.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}
