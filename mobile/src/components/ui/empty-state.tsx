import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { colors } from "@/theme";

type Props = {
	icon: ComponentProps<typeof Feather>["name"];
	title: string;
	description?: string;
};

export function EmptyState({ icon, title, description }: Props) {
	return (
		<View className="items-center gap-2 px-6 py-14">
			<View className="mb-2 size-12 items-center justify-center rounded-full bg-raised">
				<Feather name={icon} size={20} color={colors.muted} />
			</View>
			<Text className="text-headline text-fg">{title}</Text>
			{description ? <Text className="text-center text-subhead text-subtle">{description}</Text> : null}
		</View>
	);
}

/** Loading is its own state — never an empty list flashing "no items" during the first fetch. */
export function LoadingState() {
	return (
		<View className="items-center py-14">
			<ActivityIndicator color={colors.muted} />
		</View>
	);
}
