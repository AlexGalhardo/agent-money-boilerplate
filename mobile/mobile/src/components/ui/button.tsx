import { ActivityIndicator, Pressable, type PressableProps, Text } from "react-native";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = Omit<PressableProps, "children"> & {
	label: string;
	variant?: Variant;
	loading?: boolean;
};

const container: Record<Variant, string> = {
	primary: "bg-blue-600 active:bg-blue-700",
	secondary: "bg-slate-200 active:bg-slate-300",
	danger: "bg-red-600 active:bg-red-700",
	ghost: "bg-transparent active:bg-slate-100",
};

const labelColor: Record<Variant, string> = {
	primary: "text-white",
	secondary: "text-slate-900",
	danger: "text-white",
	ghost: "text-blue-600",
};

const spinnerColor: Record<Variant, string> = {
	primary: "#ffffff",
	secondary: "#0f172a",
	danger: "#ffffff",
	ghost: "#2563eb",
};

export function Button({ label, variant = "primary", loading = false, disabled, ...props }: Props) {
	const isDisabled = disabled || loading;
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled: isDisabled, busy: loading }}
			accessibilityLabel={label}
			className={`h-12 flex-row items-center justify-center rounded-xl px-4 ${container[variant]} ${
				isDisabled ? "opacity-50" : ""
			}`}
			disabled={isDisabled}
			{...props}
		>
			{loading ? (
				<ActivityIndicator color={spinnerColor[variant]} />
			) : (
				<Text className={`text-base font-semibold ${labelColor[variant]}`}>{label}</Text>
			)}
		</Pressable>
	);
}
