import { Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { formatBRL } from "@/lib/format";

type Slice = { category: string; label: string; total: number; color: string };

const SIZE = 160;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Donut chart simples com react-native-svg (cada categoria é um arco de
 * círculo via dasharray) — sem lib de gráficos externa, só o essencial pra
 * "despesas/receitas por categoria" pedido na tarefa 4d.
 */
export function CategoryPieChart({ slices, emptyLabel }: { slices: Slice[]; emptyLabel: string }) {
	const total = slices.reduce((sum, slice) => sum + slice.total, 0);

	if (total <= 0) {
		return (
			<View className="items-center justify-center py-6">
				<Text className="text-sm text-slate-400">{emptyLabel}</Text>
			</View>
		);
	}

	let offset = 0;

	return (
		<View className="flex-row items-center gap-4">
			<Svg width={SIZE} height={SIZE}>
				<G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
					{slices.map((slice) => {
						const fraction = slice.total / total;
						const dash = fraction * CIRCUMFERENCE;
						const circle = (
							<Circle
								key={slice.category}
								cx={SIZE / 2}
								cy={SIZE / 2}
								r={RADIUS}
								stroke={slice.color}
								strokeWidth={STROKE}
								strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
								strokeDashoffset={-offset}
								fill="transparent"
							/>
						);
						offset += dash;
						return circle;
					})}
				</G>
			</Svg>

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
