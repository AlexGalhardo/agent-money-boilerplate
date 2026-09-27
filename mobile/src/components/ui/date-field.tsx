import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { dateToISO, isoToBR, isoToDate } from "@/lib/format";
import { colors } from "@/theme";

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
	const [open, setOpen] = useState(false);

	return (
		<View className="gap-2">
			<Text className="text-footnote font-medium text-muted">{label}</Text>
			<Pressable
				onPress={() => setOpen((current) => !current)}
				accessibilityRole="button"
				accessibilityLabel={label}
				className="h-[52px] flex-row items-center gap-3 rounded-control bg-raised px-4 active:opacity-70"
			>
				<Feather name="calendar" size={16} color={colors.subtle} />
				<Text className={`flex-1 text-body ${value ? "text-fg" : "text-subtle"}`}>
					{value ? isoToBR(value) : placeholder}
				</Text>
				{value && onClear ? (
					<Pressable
						onPress={() => {
							setOpen(false);
							onClear();
						}}
						hitSlop={10}
						accessibilityRole="button"
						accessibilityLabel={`Limpar ${label}`}
						className="active:opacity-60"
					>
						<Feather name="x" size={16} color={colors.subtle} />
					</Pressable>
				) : null}
			</Pressable>

			{open ? (
				<View className="gap-2">
					<DateTimePicker
						value={value ? isoToDate(value) : new Date()}
						mode="date"
						display={Platform.OS === "ios" ? "inline" : "default"}
						themeVariant="dark"
						accentColor={colors.brand}
						minimumDate={minimumDate}
						maximumDate={maximumDate}
						onChange={(event, selected) => {
							if (Platform.OS !== "ios") setOpen(false);
							if (event.type === "dismissed") return;
							if (selected) onChange(dateToISO(selected));
						}}
					/>
					{Platform.OS === "ios" ? (
						<Pressable onPress={() => setOpen(false)} className="self-end px-3 py-2 active:opacity-60">
							<Text className="text-subhead font-semibold text-brand">Concluir</Text>
						</Pressable>
					) : null}
				</View>
			) : null}
		</View>
	);
}
