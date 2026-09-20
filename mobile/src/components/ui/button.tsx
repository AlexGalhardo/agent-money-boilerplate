import { View } from "react-native";

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

const backgroundColor: Record<Variant, string> = {
	primary: "#2563eb",
	secondary: "#e2e8f0",
	danger: "#dc2626",
	ghost: "transparent",
};

const labelColor: Record<Variant, string> = {
	primary: "#ffffff",
	secondary: "#0f172a",
	danger: "#ffffff",
	ghost: "#2563eb",
};

export function Button({ label, variant = "primary", loading = false, disabled, onPress, className }: Props) {
	return (
		<View className={className}>
			<ReacticxButton.Root
				onPress={onPress}
				isLoading={loading}
				disabled={disabled}
				width="100%"
				height={48}
				borderRadius={12}
				backgroundColor={backgroundColor[variant]}
				accessibilityLabel={label}
			>
				<ReacticxButton.Content>
					<ReacticxButton.Label color={labelColor[variant]} size={16}>
						{label}
					</ReacticxButton.Label>
				</ReacticxButton.Content>
				<ReacticxButton.Loading>
					<ReacticxButton.Indicator color={labelColor[variant]} />
				</ReacticxButton.Loading>
			</ReacticxButton.Root>
		</View>
	);
}
