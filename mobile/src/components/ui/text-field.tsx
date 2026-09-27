import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, type TextInputProps, View } from "react-native";

import { colors } from "@/theme";

type Props = TextInputProps & {
	label: string;
	error?: string | null;
	hint?: string;
};

/**
 * `testID` defaults to `field-<label>` — the Maestro flows in mobile/maestro/
 * target inputs by it, so keep labels stable or pass an explicit testID.
 */
export function TextField({ label, error, hint, secureTextEntry, testID, ...props }: Props) {
	const [focused, setFocused] = useState(false);
	const [revealed, setRevealed] = useState(false);
	const borderClass = error ? "border-danger" : focused ? "border-brand" : "border-transparent";

	return (
		<View className="gap-2">
			<Text className="text-footnote font-medium text-muted">{label}</Text>
			<View className={`h-[52px] flex-row items-center rounded-control border bg-raised px-4 ${borderClass}`}>
				<TextInput
					{...props}
					testID={testID ?? `field-${label}`}
					accessibilityLabel={label}
					secureTextEntry={secureTextEntry && !revealed}
					placeholderTextColor={colors.subtle}
					selectionColor={colors.brand}
					onFocus={(event) => {
						setFocused(true);
						props.onFocus?.(event);
					}}
					onBlur={(event) => {
						setFocused(false);
						props.onBlur?.(event);
					}}
					className="h-full flex-1 text-body text-fg web:outline-none"
				/>
				{secureTextEntry ? (
					<Pressable
						onPress={() => setRevealed((current) => !current)}
						hitSlop={10}
						accessibilityRole="button"
						accessibilityLabel={revealed ? "Ocultar senha" : "Mostrar senha"}
						className="active:opacity-60"
					>
						<Feather name={revealed ? "eye-off" : "eye"} size={18} color={colors.subtle} />
					</Pressable>
				) : null}
			</View>
			{error ? (
				<Text className="text-footnote text-danger">{error}</Text>
			) : hint ? (
				<Text className="text-footnote text-subtle">{hint}</Text>
			) : null}
		</View>
	);
}
