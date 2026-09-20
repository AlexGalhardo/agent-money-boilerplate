import { View } from "react-native";

import { useAppColorScheme } from "@/lib/theme";
import { Button as ReacticxButton } from "@/shared/components/base/button";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = {
	label: string;
	variant?: Variant;
	loading?: boolean;
	disabled?: boolean;
	onPress?: () => void;
	className?: string;
};

const backgroundColor: Record<"light" | "dark", Record<Variant, string>> = {
	light: { primary: "#2563eb", secondary: "#e2e8f0", danger: "#dc2626", ghost: "transparent" },
	dark: { primary: "#3b82f6", secondary: "#334155", danger: "#dc2626", ghost: "transparent" },
};

const labelColor: Record<"light" | "dark", Record<Variant, string>> = {
	light: { primary: "#ffffff", secondary: "#0f172a", danger: "#ffffff", ghost: "#2563eb" },
	dark: { primary: "#ffffff", secondary: "#f1f5f9", danger: "#ffffff", ghost: "#60a5fa" },
};

export function Button({ label, variant = "primary", loading = false, disabled, onPress, className }: Props) {
	const { colorScheme } = useAppColorScheme();

	return (
		<View className={className}>
			<ReacticxButton.Root
				onPress={onPress}
				isLoading={loading}
				disabled={disabled}
				width="100%"
				height={48}
				borderRadius={12}
				backgroundColor={backgroundColor[colorScheme][variant]}
				accessibilityLabel={label}
			>
				<ReacticxButton.Content>
					<ReacticxButton.Label color={labelColor[colorScheme][variant]} size={16}>
						{label}
					</ReacticxButton.Label>
				</ReacticxButton.Content>
				<ReacticxButton.Loading>
					<ReacticxButton.Indicator color={labelColor[colorScheme][variant]} />
				</ReacticxButton.Loading>
			</ReacticxButton.Root>
		</View>
	);
}
