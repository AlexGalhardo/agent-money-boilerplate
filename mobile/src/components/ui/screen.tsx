import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { type Edge, SafeAreaView } from "react-native-safe-area-context";

type Props = {
	children: ReactNode;
	/** Wraps content in a keyboard-aware ScrollView (forms). */
	scroll?: boolean;
	/** Stack screens with a native header only need the bottom edge. */
	edges?: Edge[];
	contentClassName?: string;
};

export function Screen({ children, scroll = false, edges = ["top", "left", "right"], contentClassName = "" }: Props) {
	return (
		<SafeAreaView className="flex-1 bg-canvas" edges={edges}>
			{scroll ? (
				<KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
					<ScrollView
						contentContainerClassName={`grow px-5 py-6 ${contentClassName}`}
						keyboardShouldPersistTaps="handled"
						keyboardDismissMode="interactive"
					>
						{children}
					</ScrollView>
				</KeyboardAvoidingView>
			) : (
				<View className={`flex-1 ${contentClassName}`}>{children}</View>
			)}
		</SafeAreaView>
	);
}
