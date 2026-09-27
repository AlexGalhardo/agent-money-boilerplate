import { Feather } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme";

/**
 * Grouped section: surface background, no border — grouping comes from the
 * surface contrast against the canvas, rows are split by hairlines.
 */
export function Section({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
	return (
		<View className="gap-2">
			{title ? <Text className="px-1 text-caption font-semibold uppercase text-subtle">{title}</Text> : null}
			<View className="overflow-hidden rounded-card bg-surface">{children}</View>
			{footer ? <Text className="px-1 text-footnote text-subtle">{footer}</Text> : null}
		</View>
	);
}

type RowProps = {
	label: string;
	value?: string;
	icon?: ComponentProps<typeof Feather>["name"];
	destructive?: boolean;
	onPress?: () => void;
	last?: boolean;
	accessibilityLabel?: string;
};

export function Row({ label, value, icon, destructive, onPress, last, accessibilityLabel }: RowProps) {
	const tint = destructive ? colors.danger : colors.muted;

	return (
		<Pressable
			onPress={onPress}
			disabled={!onPress}
			accessibilityRole={onPress ? "button" : undefined}
			accessibilityLabel={accessibilityLabel ?? label}
			className="flex-row items-center gap-3 px-4 active:bg-raised"
		>
			{icon ? <Feather name={icon} size={18} color={tint} /> : null}
			<View className={`min-h-[52px] flex-1 flex-row items-center gap-3 ${last ? "" : "border-b border-line"}`}>
				<Text className={`flex-1 text-body ${destructive ? "text-danger" : "text-fg"}`}>{label}</Text>
				{value ? <Text className="text-subhead text-subtle">{value}</Text> : null}
				{onPress && !destructive ? <Feather name="chevron-right" size={18} color={colors.subtle} /> : null}
			</View>
		</Pressable>
	);
}

/** Padded content block inside a Section (forms, descriptions). */
export function SectionBody({ children }: { children: ReactNode }) {
	return <View className="gap-4 p-4">{children}</View>;
}
