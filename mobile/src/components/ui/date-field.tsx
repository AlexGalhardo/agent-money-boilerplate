import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Text, View } from "react-native";

import { dateToISO, isoToBR, isoToDate } from "@/lib/format";
import { useAppColorScheme } from "@/lib/theme";
import { Pressable } from "@/shared/components/atoms/pressable";

type Props = {
	label: string;
	value: string | null;
	onChange: (iso: string) => void;
	placeholder?: string;
	onClear?: () => void;
	minimumDate?: Date;
	maximumDate?: Date;
};

export function DateField({
	label,
	value,
	onChange,
	placeholder = "Selecionar data",
	onClear,
	minimumDate,
	maximumDate,
}: Props) {
	const [show, setShow] = useState(false);
	const { isDark } = useAppColorScheme();
	const current = value ? isoToDate(value) : new Date();

	return (
		<View className="gap-1.5">
			<Text className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</Text>
			<View className="flex-row items-center gap-2">
				<Pressable
					onPress={() => setShow((prev) => !prev)}
					style={{
						flex: 1,
						height: 48,
						justifyContent: "center",
						borderRadius: 12,
						borderWidth: 1,
						borderColor: isDark ? "#475569" : "#cbd5e1",
						backgroundColor: isDark ? "#1e293b" : "#ffffff",
						paddingHorizontal: 16,
					}}
				>
					<Text
						className={`text-base ${value ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}`}
					>
						{value ? isoToBR(value) : placeholder}
					</Text>
				</Pressable>
				{value && onClear ? (
					<Pressable
						onPress={() => {
							setShow(false);
							onClear();
						}}
						hitSlop={8}
						style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
					>
						<Text className="text-sm font-medium text-blue-600">Limpar</Text>
					</Pressable>
				) : null}
			</View>

			{show ? (
				<View className={Platform.OS === "ios" ? "items-start" : undefined}>
					<DateTimePicker
						value={current}
						mode="date"
						display={Platform.OS === "ios" ? "inline" : "default"}
						minimumDate={minimumDate}
						maximumDate={maximumDate}
						onChange={(event, selected) => {
							if (Platform.OS !== "ios") setShow(false);
							if (event.type === "dismissed") return;
							if (selected) onChange(dateToISO(selected));
						}}
					/>
					{Platform.OS === "ios" ? (
						<Pressable
							onPress={() => setShow(false)}
							style={{
								marginTop: 4,
								alignSelf: "flex-end",
								borderRadius: 8,
								paddingHorizontal: 12,
								paddingVertical: 8,
							}}
						>
							<Text className="text-sm font-semibold text-blue-600">Concluir</Text>
						</Pressable>
					) : null}
				</View>
			) : null}
		</View>
	);
}
