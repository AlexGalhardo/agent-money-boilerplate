import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/components/ui/screen";
import { colors } from "@/theme";

type Props = {
	title: string;
	subtitle?: string;
	children: ReactNode;
	footer?: ReactNode;
};

/** Frame shared by every unauthenticated screen: brand mark, heading, form, footer link. */
export function AuthShell({ title, subtitle, children, footer }: Props) {
	return (
		<Screen scroll edges={["top", "bottom", "left", "right"]} contentClassName="justify-center">
			<View className="mb-10 size-12 items-center justify-center rounded-card bg-brand/15">
				<Feather name="trending-up" size={22} color={colors.brand} />
			</View>
			<Text className="text-display text-fg">{title}</Text>
			{subtitle ? <Text className="mt-2 text-body text-muted">{subtitle}</Text> : null}
			<View className="mt-8 gap-5">{children}</View>
			{footer ? <View className="mt-8 flex-row justify-center gap-1">{footer}</View> : null}
		</Screen>
	);
}

export function Divider({ label }: { label: string }) {
	return (
		<View className="flex-row items-center gap-3">
			<View className="h-px flex-1 bg-line" />
			<Text className="text-caption text-subtle">{label}</Text>
			<View className="h-px flex-1 bg-line" />
		</View>
	);
}
