import { forwardRef } from "react";
import { Text, TextInput, type TextInputProps, View } from "react-native";

type Props = TextInputProps & {
	label: string;
	error?: string | null;
};

export const TextField = forwardRef<TextInput, Props>(function TextField({ label, error, ...props }, ref) {
	return (
		<View className="gap-1.5">
			<Text className="text-sm font-medium text-slate-700">{label}</Text>
			<TextInput
				ref={ref}
				accessibilityLabel={label}
				testID={props.testID ?? `field-${label}`}
				className={`h-12 rounded-xl border bg-white px-4 text-base text-slate-900 ${
					error ? "border-red-400" : "border-slate-300"
				}`}
				placeholderTextColor="#94a3b8"
				{...props}
			/>
			{error ? <Text className="text-xs text-red-600">{error}</Text> : null}
		</View>
	);
});
