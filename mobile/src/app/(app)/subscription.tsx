import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Screen } from "@/components/ui/screen";
import { api } from "@/lib/api";
import { hasActivePlan, planRemainingLabel } from "@/lib/plan";
import { useMeQuery, useRefreshMe } from "@/query/me";
import { colors } from "@/theme";

type PlanId = "monthly" | "annual";
type Charge = { id: string; brCode: string; brCodeBase64: string; expiresAt: string };

const PLANS: { id: PlanId; label: string; price: string; period: string; description: string; badge?: string }[] = [
	{ id: "monthly", label: "Mensal", price: "R$ 9,90", period: "/mês", description: "1 mês de acesso ao plano PRO." },
	{
		id: "annual",
		label: "Anual",
		price: "R$ 99,90",
		period: "/ano",
		description: "12 meses de acesso ao plano PRO.",
		badge: "2 meses grátis",
	},
];

const BENEFITS = ["Transações ilimitadas", "Bot do Telegram", "Importação de extratos", "Relatórios em PDF"];
const POLL_INTERVAL_MS = 3000;

export default function SubscriptionScreen() {
	const router = useRouter();
	const meQuery = useMeQuery();
	const refreshMe = useRefreshMe();

	const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [charge, setCharge] = useState<Charge | null>(null);
	const [status, setStatus] = useState<"pending" | "paid" | "expired">("pending");
	const [copied, setCopied] = useState(false);
	const paidRef = useRef(false);

	useEffect(() => {
		if (!charge || status !== "pending") return;

		const interval = setInterval(async () => {
			const { data } = await api.payments.pix({ id: charge.id }).status.get();
			if (!data || !("status" in data)) return;

			if (data.status === "paid" && !paidRef.current) {
				paidRef.current = true;
				setStatus("paid");
				await refreshMe();
			} else if (data.status === "expired") {
				setStatus("expired");
			}
		}, POLL_INTERVAL_MS);

		return () => clearInterval(interval);
	}, [charge, status, refreshMe]);

	async function handlePay(plan: PlanId): Promise<void> {
		setError(null);
		setLoadingPlan(plan);
		const { data, error: requestError } = await api.payments.pix.checkout.post({ plan });
		setLoadingPlan(null);

		if (requestError || !data || !("id" in data)) {
			setError("Não foi possível gerar o PIX. Tente novamente em instantes.");
			return;
		}

		setStatus("pending");
		paidRef.current = false;
		setCharge({ id: data.id, brCode: data.brCode, brCodeBase64: data.brCodeBase64, expiresAt: data.expiresAt });
	}

	async function handleCopy(): Promise<void> {
		if (!charge) return;
		await Clipboard.setStringAsync(charge.brCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	const me = meQuery.data;
	const activePlan = me ? hasActivePlan(me) : false;
	const remaining = me ? planRemainingLabel(me) : null;
	const qrSrc = charge?.brCodeBase64.startsWith("data:")
		? charge.brCodeBase64
		: `data:image/png;base64,${charge?.brCodeBase64}`;

	if (status === "paid") {
		return (
			<Screen scroll edges={["left", "right", "bottom"]} contentClassName="items-center justify-center gap-4">
				<View className="size-14 items-center justify-center rounded-full bg-income/15">
					<Feather name="check" size={26} color={colors.income} />
				</View>
				<Text className="text-title text-fg">Pagamento confirmado</Text>
				<Text className="text-center text-body text-muted">Sua conta já está no plano PRO.</Text>
				<Button
					label="Voltar ao início"
					onPress={() => router.replace("/dashboard")}
					className="self-stretch"
				/>
			</Screen>
		);
	}

	return (
		<Screen scroll edges={["left", "right", "bottom"]} contentClassName="gap-6">
			{activePlan ? (
				<Notice kind="success" message={`Plano PRO ativo${remaining ? ` — ${remaining}` : ""}.`} />
			) : (
				<View className="gap-3">
					<Text className="text-title text-fg">Seja PRO</Text>
					{BENEFITS.map((benefit) => (
						<View key={benefit} className="flex-row items-center gap-3">
							<Feather name="check" size={16} color={colors.brand} />
							<Text className="text-body text-muted">{benefit}</Text>
						</View>
					))}
					<Text className="text-footnote text-subtle">
						Pagamento único via PIX, sem renovação automática.
					</Text>
				</View>
			)}

			<Notice kind="error" message={error} />

			{charge && status === "pending" ? (
				<View className="items-center gap-4 rounded-card bg-surface p-5">
					<Text className="text-subhead text-muted">Escaneie o QR code ou copie o código PIX</Text>
					<View className="rounded-control bg-white p-3">
						<Image source={{ uri: qrSrc }} className="size-52" accessibilityLabel="QR code PIX" />
					</View>
					<Pressable
						onPress={handleCopy}
						accessibilityRole="button"
						accessibilityLabel="Copiar código PIX"
						className="w-full flex-row items-center gap-3 rounded-control bg-raised px-4 py-3 active:opacity-70"
					>
						<Text className="flex-1 text-footnote text-muted" numberOfLines={1}>
							{charge.brCode}
						</Text>
						<Feather
							name={copied ? "check" : "copy"}
							size={16}
							color={copied ? colors.income : colors.fg}
						/>
					</Pressable>
					<Text className="text-caption text-subtle">Aguardando confirmação do pagamento…</Text>
				</View>
			) : null}

			{status === "expired" ? (
				<Notice kind="warning" message="Esse PIX expirou. Gere um novo código abaixo." />
			) : null}

			{!activePlan ? (
				<View className="gap-3">
					{PLANS.map((plan) => (
						<View key={plan.id} className="gap-4 rounded-card bg-surface p-5">
							<View className="flex-row items-center justify-between">
								<Text className="text-headline text-fg">{plan.label}</Text>
								{plan.badge ? (
									<View className="rounded-full bg-brand/15 px-2.5 py-1">
										<Text className="text-caption font-semibold text-brand">{plan.badge}</Text>
									</View>
								) : null}
							</View>
							<View className="flex-row items-baseline gap-1">
								<Text className="text-display text-fg">{plan.price}</Text>
								<Text className="text-subhead text-subtle">{plan.period}</Text>
							</View>
							<Text className="text-subhead text-muted">{plan.description}</Text>
							<Button
								label="Pagar com PIX"
								variant={plan.id === "annual" ? "primary" : "secondary"}
								onPress={() => handlePay(plan.id)}
								loading={loadingPlan === plan.id}
							/>
						</View>
					))}
				</View>
			) : null}
		</Screen>
	);
}
