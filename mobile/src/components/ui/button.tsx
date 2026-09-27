import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { colors } from "@/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

type Props = {
	label: string;
	variant?: Variant;
	size?: Size;
	loading?: boolean;
	disabled?: boolean;
	icon?: ReactNode;
	onPress?: () => void;
	className?: string;
};

const containerClass: Record<Variant, string> = {
	primary: "bg-primary",
	secondary: "bg-raised",
	ghost: "bg-transparent",
	danger: "bg-danger/15",
};

const labelClass: Record<Variant, string> = {
	primary: "text-on-primary",
	secondary: "text-fg",
	ghost: "text-muted",
	danger: "text-danger",
};

const spinnerColor: Record<Variant, string> = {
	primary: colors["on-primary"],
	secondary: colors.fg,
	ghost: colors.muted,
	danger: colors.danger,
};

const sizeClass: Record<Size, string> = { md: "h-11 px-4", lg: "h-[52px] px-5" };

export function Button({
	label,
	variant = "primary",
	size = "lg",
	loading = false,
	disabled = false,
	icon,
	onPress,
	className = "",
}: Props) {
	const inactive = disabled || loading;

	return (
		<Pressable
			onPress={onPress}
			disabled={inactive}
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled: inactive, busy: loading }}
			className={`flex-row items-center justify-center gap-2 rounded-control ${sizeClass[size]} ${containerClass[variant]} ${inactive ? "opacity-40" : "active:opacity-70"} ${className}`}
		>
			{loading ? (
				<ActivityIndicator color={spinnerColor[variant]} />
			) : (
				<>
					{icon ? <View>{icon}</View> : null}
					<Text className={`text-headline ${labelClass[variant]}`}>{label}</Text>
				</>
			)}
		</Pressable>
	);
}
