import { Text, View } from "react-native";

import { formatBRL } from "@/lib/format";
import { PieChart } from "@/shared/components/charts/pie-chart";

type Slice = { category: string; label: string; total: number; color: string };

export function CategoryPieChart({ slices, emptyLabel }: { slices: Slice[]; emptyLabel: string }) {
	const total = slices.reduce((sum, slice) => sum + slice.total, 0);

	if (total <= 0) {
		return (
			<View className="items-center justify-center py-6">
				<Text className="text-sm text-slate-400">{emptyLabel}</Text>
			</View>
		);
	}

	const points = slices.map((slice) => ({ label: slice.label, value: slice.total, color: slice.color }));

	return (
		<View className="flex-row items-center gap-4">
			<PieChart.Root data={points} radius={70} innerRadius={0.65} style={{ width: 160, height: 160 }}>
				<PieChart.Slices />
			</PieChart.Root>

			<View className="flex-1 gap-1.5">
				{slices.map((slice) => (
					<View key={slice.category} className="flex-row items-center gap-2">
						<View className="size-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
						<Text className="flex-1 text-xs text-slate-600" numberOfLines={1}>
							{slice.label}
						</Text>
						<Text className="text-xs font-medium text-slate-500">{formatBRL(slice.total)}</Text>
					</View>
				))}
			</View>
		</View>
	);
}
