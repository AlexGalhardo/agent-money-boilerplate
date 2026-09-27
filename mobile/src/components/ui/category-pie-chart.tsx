import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { formatBRL } from "@/lib/format";
import { colors } from "@/theme";

type Slice = { category: string; label: string; total: number; color: string };

const SIZE = 132;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Visual gap between segments, in px along the ring.
const GAP = 2;

/**
 * Donut drawn with plain react-native-svg strokes: each slice is a circle
 * with a dash of its share of the circumference, offset by the slices before
 * it. Replaces a 700-line Skia chart that only rendered this.
 */
export function CategoryPieChart({ slices, emptyLabel }: { slices: Slice[]; emptyLabel: string }) {
	const total = slices.reduce((sum, slice) => sum + slice.total, 0);

	if (total <= 0) {
		return <Text className="py-6 text-center text-subhead text-subtle">{emptyLabel}</Text>;
	}

	let offset = 0;
	const arcs = slices.map((slice) => {
		const length = (slice.total / total) * CIRCUMFERENCE;
		const arc = { ...slice, length: Math.max(0, length - (slices.length > 1 ? GAP : 0)), offset };
		offset += length;
		return arc;
	});

	return (
		<View className="flex-row items-center gap-5">
			<Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
				<Circle
					cx={SIZE / 2}
					cy={SIZE / 2}
					r={RADIUS}
					stroke={colors.raised}
					strokeWidth={STROKE}
					fill="none"
				/>
				{arcs.map((arc) => (
					<Circle
						key={arc.category}
						cx={SIZE / 2}
						cy={SIZE / 2}
						r={RADIUS}
						stroke={arc.color}
						strokeWidth={STROKE}
						fill="none"
						strokeDasharray={`${arc.length} ${CIRCUMFERENCE}`}
						strokeDashoffset={-arc.offset}
						transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
					/>
				))}
			</Svg>

			<View className="flex-1 gap-2">
				{slices.map((slice) => (
					<View key={slice.category} className="flex-row items-center gap-2">
						<View className="size-2 rounded-full" style={{ backgroundColor: slice.color }} />
						<Text className="flex-1 text-footnote text-muted" numberOfLines={1}>
							{slice.label}
						</Text>
						<Text className="text-footnote font-medium text-fg">{formatBRL(slice.total)}</Text>
					</View>
				))}
			</View>
		</View>
	);
}
