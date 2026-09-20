import { Text, type TextInputProps, View } from "react-native";

import AnimatedInputBar from "@/shared/components/base/animated-input-bar";

type Props = TextInputProps & {
	label: string;
	error?: string | null;
};

export function TextField({ label, error, placeholder, ...props }: Props) {
	return (
		<View className="gap-1.5">
			<Text className="text-sm font-medium text-slate-700">{label}</Text>
			<AnimatedInputBar
				placeholders={[placeholder ?? ""]}
				accessibilityLabel={label}
				testID={props.testID ?? `field-${label}`}
				containerStyle={{ marginVertical: 0 }}
				inputWrapperStyle={{
					minHeight: 48,
					paddingHorizontal: 16,
					paddingVertical: 0,
					borderRadius: 12,
					borderWidth: 1,
					borderColor: error ? "#f87171" : "#cbd5e1",
					backgroundColor: "#ffffff",
				}}
				inputStyle={{ fontSize: 16, color: "#0f172a" }}
				placeholderStyle={{ color: "#94a3b8" }}
				{...props}
			/>
			{error ? <Text className="text-xs text-red-600">{error}</Text> : null}
		</View>
	);
}
