import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { getCategoryColor, getCategoryLabel } from "@/lib/categories";
import { categoryIcon } from "@/lib/category-icons";
import { formatBRL, isoToBR } from "@/lib/format";
import type { Transaction } from "@/query/transactions";

type Props = {
	transaction: Transaction;
	onPress: () => void;
	last?: boolean;
};

/** A list row inside a grouped Section — tap opens the transaction, deletion lives in the edit screen. */
export function TransactionRow({ transaction, onPress, last }: Props) {
	const color = getCategoryColor(transaction.category, transaction.type);
	const income = transaction.type === "income";

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={transaction.description}
			className="flex-row items-center gap-3 pl-4 active:bg-raised"
		>
			<View
				className="size-10 items-center justify-center rounded-full"
				style={{ backgroundColor: `${color}26` }}
			>
				<Feather name={categoryIcon[transaction.category]} size={17} color={color} />
			</View>
			<View
				className={`min-h-[64px] flex-1 flex-row items-center gap-3 pr-4 ${last ? "" : "border-b border-line"}`}
			>
				<View className="flex-1">
					<Text className="text-body font-medium text-fg" numberOfLines={1}>
						{transaction.description}
					</Text>
					<Text className="mt-0.5 text-footnote text-subtle">
						{getCategoryLabel(transaction.category)} · {isoToBR(transaction.date)}
					</Text>
				</View>
				<Text className={`text-body font-semibold ${income ? "text-income" : "text-fg"}`}>
					{income ? "+" : "−"} {formatBRL(transaction.amount)}
				</Text>
			</View>
		</Pressable>
	);
}
