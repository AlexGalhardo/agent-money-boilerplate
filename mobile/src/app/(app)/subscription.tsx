import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { hasActivePlan, planDaysRemaining } from "@/lib/plan";

type PlanId = "monthly" | "annual";
type Charge = { id: string; brCode: string; brCodeBase64: string; expiresAt: string };

const PLANS: { id: PlanId; label: string; price: string; description: string }[] = [
	{ id: "monthly", label: "Mensal", price: "R$ 9,90", description: "1 mês de acesso ao plano PRO." },
	{
		id: "annual",
		label: "Anual",
		price: "R$ 99,90",
		description: "12 meses de acesso ao plano PRO (2 meses grátis).",
	},
];

const POLL_INTERVAL_MS = 3000;

export default function SubscriptionScreen() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const meQuery = useQuery({
		queryKey: ["me"],
		queryFn: async () => {
			const { data, error } = await api.users.me.get();
			if (error || !data || !("user" in data)) throw new Error("Falha ao carregar dados da conta");
			return data.user;
		},
	});

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
				await queryClient.invalidateQueries({ queryKey: ["me"] });
			} else if (data.status === "expired") {
				setStatus("expired");
			}
		}, POLL_INTERVAL_MS);

		return () => clearInterval(interval);
	}, [charge, status, queryClient]);

	async function handlePay(plan: PlanId): Promise<void> {
		setError(null);
		setLoadingPlan(plan);
		const { data, error: requestError } = await api.payments.pix.checkout.post({ plan });
		setLoadingPlan(null);

		if (requestError || !data || !("id" in data)) {
			setError("Não foi possível gerar o PIX");
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

	const activePlan = meQuery.data ? hasActivePlan(meQuery.data) : false;
	const daysRemaining = meQuery.data ? planDaysRemaining(meQuery.data) : null;
	const qrSrc = charge?.brCodeBase64.startsWith("data:")
		? charge.brCodeBase64
		: `data:image/png;base64,${charge?.brCodeBase64}`;

	return (
		<SafeAreaView className="flex-1 bg-white">
			<View className="flex-row items-center justify-between border-b border-slate-200 px-5 py-3">
				<Pressable onPress={() => router.back()} hitSlop={8}>
					<Text className="text-base font-medium text-blue-600">Voltar</Text>
				</Pressable>
				<Text className="text-base font-semibold text-slate-900">Assinatura</Text>
				<View className="w-14" />
			</View>

			<ScrollView contentContainerClassName="p-6 gap-4">
				{activePlan ? (
					<Animated.View
						entering={FadeInDown.duration(200)}
						className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"
					>
						<Text className="text-sm font-semibold text-emerald-700">
							Plano PRO ativo
							{daysRemaining !== null
								? ` — ${daysRemaining} dia${daysRemaining === 1 ? "" : "s"} restantes`
								: ""}
						</Text>
					</Animated.View>
				) : (
					<Text className="text-sm text-slate-500">Pagamento único via PIX, sem renovação automática.</Text>
				)}

				{error ? <Text className="text-sm text-red-600">{error}</Text> : null}

				{status === "paid" ? (
					<Animated.View
						entering={FadeInDown.duration(200)}
						className="items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-6"
					>
						<Text className="text-base font-semibold text-emerald-700">Pagamento confirmado! 🎉</Text>
						<Text className="text-sm text-emerald-600">Sua conta já está no plano PRO.</Text>
						<Button
							label="Voltar ao dashboard"
							onPress={() => router.replace("/dashboard")}
							variant="secondary"
						/>
					</Animated.View>
				) : charge && status === "pending" ? (
					<Animated.View
						entering={FadeInDown.duration(200)}
						className="items-center gap-4 rounded-xl border border-slate-200 p-4"
					>
						<Text className="text-sm text-slate-500">Escaneie o QR code ou copie o código PIX abaixo:</Text>
						<Image source={{ uri: qrSrc }} className="size-56 rounded-lg border border-slate-200" />
						<View className="w-full flex-row items-center gap-2">
							<Text
								className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
								numberOfLines={1}
							>
								{charge.brCode}
							</Text>
							<Pressable onPress={handleCopy} className="rounded-lg border border-slate-200 px-3 py-2">
								<Text className="text-xs font-medium text-blue-600">
									{copied ? "Copiado!" : "Copiar"}
								</Text>
							</Pressable>
						</View>
						<Text className="text-xs text-slate-400">Aguardando confirmação do pagamento...</Text>
					</Animated.View>
				) : status === "expired" ? (
					<Text className="text-sm text-red-600">Esse PIX expirou. Gere um novo código abaixo.</Text>
				) : null}

				{!activePlan && status !== "paid" ? (
					<View className="mt-2 gap-3">
						{PLANS.map((plan) => (
							<View key={plan.id} className="rounded-xl border border-slate-200 p-4">
								<Text className="text-lg font-semibold text-slate-900">{plan.label}</Text>
								<Text className="mt-1 text-2xl font-bold text-slate-900">{plan.price}</Text>
								<Text className="mt-1 text-sm text-slate-500">{plan.description}</Text>
								<Button
									label="Pagar com PIX"
									onPress={() => handlePay(plan.id)}
									loading={loadingPlan === plan.id}
									className="mt-4"
								/>
							</View>
						))}
					</View>
				) : null}
			</ScrollView>
		</SafeAreaView>
	);
}
