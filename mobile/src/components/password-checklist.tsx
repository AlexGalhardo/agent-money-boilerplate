import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { PASSWORD_RULES } from "@/lib/password-rules";
import { colors } from "@/theme";

export function PasswordChecklist({ password }: { password: string }) {
	if (!password) return null;

	return (
		<View className="gap-1.5">
			{PASSWORD_RULES.map((rule) => {
				const ok = rule.test(password);
				return (
					<View key={rule.key} className="flex-row items-center gap-2">
						<Feather name={ok ? "check" : "x"} size={13} color={ok ? colors.income : colors.subtle} />
						<Text className={`text-footnote ${ok ? "text-income" : "text-subtle"}`}>{rule.label}</Text>
					</View>
				);
			})}
		</View>
	);
}
