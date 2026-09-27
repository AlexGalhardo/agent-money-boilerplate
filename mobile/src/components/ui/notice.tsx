import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { colors } from "@/theme";

type Tone = "error" | "success" | "warning" | "info";

const tone: Record<
	Tone,
	{ icon: "alert-circle" | "check-circle" | "alert-triangle" | "info"; color: string; bg: string }
> = {
	error: { icon: "alert-circle", color: colors.danger, bg: "bg-danger/10" },
	success: { icon: "check-circle", color: colors.income, bg: "bg-income/10" },
	warning: { icon: "alert-triangle", color: colors.warning, bg: "bg-warning/10" },
	info: { icon: "info", color: colors.muted, bg: "bg-raised" },
};

/** Inline feedback — field errors and success messages stay in the layout, never in an alert. */
export function Notice({ kind, message }: { kind: Tone; message: string | null | undefined }) {
	if (!message) return null;
	const { icon, color, bg } = tone[kind];

	return (
		<View
			accessibilityRole={kind === "error" ? "alert" : undefined}
			className={`flex-row items-start gap-3 rounded-control px-4 py-3 ${bg}`}
		>
			<Feather name={icon} size={16} color={color} style={{ marginTop: 2 }} />
			<Text className="flex-1 text-subhead text-fg">{message}</Text>
		</View>
	);
}
