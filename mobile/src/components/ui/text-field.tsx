import { Text, type TextInputProps, View } from "react-native";

import { useAppColorScheme } from "@/lib/theme";
import AnimatedInputBar from "@/shared/components/base/animated-input-bar";

type Props = TextInputProps & {
	label: string;
	error?: string | null;
};

export function TextField({ label, error, placeholder, ...props }: Props) {
	const { isDark } = useAppColorScheme();

	return (
		<View className="gap-1.5">
			<Text className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</Text>
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
					borderColor: error ? "#f87171" : isDark ? "#475569" : "#cbd5e1",
					backgroundColor: isDark ? "#1e293b" : "#ffffff",
				}}
				inputStyle={{ fontSize: 16, color: isDark ? "#f1f5f9" : "#0f172a" }}
				placeholderStyle={{ color: isDark ? "#64748b" : "#94a3b8" }}
				{...props}
			/>
			{error ? <Text className="text-xs text-red-600">{error}</Text> : null}
		</View>
	);
}
