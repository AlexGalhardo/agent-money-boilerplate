import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrencyCents, getCategoryLabel } from "../lib/categories";
import { useIsDarkTheme } from "./theme-toggle";

export type PieDatum = {
	category: string;
	total: number;
	percentage: number;
};

function TooltipContent({ active, payload }: { active?: boolean; payload?: { payload: PieDatum }[] }) {
	if (!active || !payload?.length) return null;
	const datum = payload[0]?.payload;
	if (!datum) return null;

	return (
		<div className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm shadow-lg">
			<p className="font-medium">{getCategoryLabel(datum.category)}</p>
			<p className="text-(--color-fg-muted)">
				{formatCurrencyCents(datum.total)} · {datum.percentage.toFixed(1)}%
			</p>
		</div>
	);
}

export function CategoryPieChart({
	data,
	colors,
	emptyLabel,
}: {
	data: PieDatum[];
	colors: Record<string, { light: string; dark: string }>;
	emptyLabel: string;
}) {
	const isDark = useIsDarkTheme();

	if (data.length === 0) {
		return <p className="py-8 text-center text-sm text-(--color-fg-muted)">{emptyLabel}</p>;
	}

	return (
		<div>
			<div className="h-72 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie
							data={data}
							dataKey="percentage"
							nameKey="category"
							innerRadius="55%"
							outerRadius="80%"
							paddingAngle={2}
							strokeWidth={2}
							stroke="var(--color-surface)"
						>
							{data.map((entry) => {
								const color = colors[entry.category];
								const fill = color ? (isDark ? color.dark : color.light) : "#898781";
								return <Cell key={entry.category} fill={fill} />;
							})}
						</Pie>
						<Tooltip content={<TooltipContent />} />
						<Legend
							formatter={(value: string) => (
								<span className="text-sm text-(--color-fg)">{getCategoryLabel(value)}</span>
							)}
						/>
					</PieChart>
				</ResponsiveContainer>
			</div>

			<ul className="mt-2 flex flex-col divide-y divide-(--color-border) border-t border-(--color-border)">
				{data.map((entry) => (
					<li key={entry.category} className="flex items-center justify-between gap-4 py-2 text-sm">
						<span>{getCategoryLabel(entry.category)}</span>
						<span className="font-medium tabular-nums">{formatCurrencyCents(entry.total)}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
