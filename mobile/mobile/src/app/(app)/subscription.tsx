import { type Currency, formatMoney, type PlanId, type SubscriptionStatus } from "@op/shared";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { billingSupported, useCancelSubscription, useCheckout, usePlans, useSubscription } from "@/query/subscription";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
	incomplete: "Aguardando pagamento",
	pending: "Aguardando confirmação do PIX",
	active: "Ativa",
	past_due: "Pagamento em atraso",
	canceled: "Cancelada (acesso até o fim do período)",
	expired: "Expirada",
};

export default function SubscriptionScreen() {
	const router = useRouter();
	const plansQuery = usePlans();
	const subQuery = useSubscription();
	const checkout = useCheckout();
	const cancel = useCancelSubscription();

	const [planId, setPlanId] = useState<PlanId>("monthly");
	const [currency, setCurrency] = useState<Currency>("BRL");
	const [method, setMethod] = useState<"card" | "pix">("card");
	const [pix, setPix] = useState<{ code: string; expiresAt: string } | null>(null);

	const current = subQuery.data?.subscription ?? null;
	const isPremium = subQuery.data?.isPremium ?? false;

	const priceOf = (p: PlanId) =>
		plansQuery.data?.plans.find((x) => x.id === p)?.prices.find((pr) => pr.currency === currency)?.amountCents ?? 0;

	const onSubscribe = async () => {
		setPix(null);
		try {
			const res = await checkout.mutateAsync({
				planId,
				currency,
				paymentMethod: method,
			});
			if (res.provider === "stripe") {
				await WebBrowser.openBrowserAsync(res.checkoutUrl);
				subQuery.refetch();
			} else {
				setPix({ code: res.pixCode, expiresAt: res.expiresAt });
			}
		} catch (e) {
			Alert.alert("Não foi possível iniciar", e instanceof Error ? e.message : "Tente novamente.");
		}
	};

	const onCancel = () => {
		Alert.alert("Cancelar assinatura", "Você mantém o acesso até o fim do período já pago. Confirmar?", [
			{ text: "Voltar", style: "cancel" },
			{
				text: "Cancelar assinatura",
				style: "destructive",
				onPress: () => cancel.mutate(true),
			},
		]);
	};

	return (
		<SafeAreaView className="flex-1 bg-white">
			<View className="flex-row items-center justify-between border-b border-slate-200 px-5 py-3">
				<Pressable onPress={() => router.back()} hitSlop={8}>
					<Text className="text-base font-medium text-blue-600">Voltar</Text>
				</Pressable>
				<Text className="text-base font-semibold text-slate-900">Assinatura</Text>
				<View className="w-14" />
			</View>

			<Animated.ScrollView entering={FadeInDown.duration(220)} contentContainerClassName="p-6 gap-6">
				{subQuery.isPending ? (
					<ActivityIndicator />
				) : (
					<View className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
						<Text className="text-xs uppercase tracking-wide text-slate-400">Status atual</Text>
						{current ? (
							<>
								<Text className="mt-1 text-lg font-bold text-slate-900">
									Plano {current.planId === "monthly" ? "Mensal" : "Anual"} ·{" "}
									{STATUS_LABEL[current.status]}
								</Text>
								<Text className="mt-1 text-sm text-slate-600">
									{formatMoney(current.amountCents, current.currency)} ·{" "}
									{current.paymentMethod === "pix" ? "PIX" : "Cartão"}
								</Text>
								{current.currentPeriodEnd ? (
									<Text className="mt-1 text-xs text-slate-500">
										Acesso até {new Date(current.currentPeriodEnd).toLocaleDateString("pt-BR")}
									</Text>
								) : null}
							</>
						) : (
							<Text className="mt-1 text-base font-semibold text-slate-700">
								Você ainda não tem uma assinatura.
							</Text>
						)}
						{isPremium ? (
							<Text className="mt-2 text-sm font-semibold text-emerald-600">
								Acesso premium liberado ✓
							</Text>
						) : null}
					</View>
				)}

				{!billingSupported ? (
					<View className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4">
						<Text className="text-sm text-amber-800">
							O app está em modo offline (local). Para assinar, gere um build com{" "}
							<Text className="font-semibold">EXPO_PUBLIC_DATA_MODE=remote</Text>.
						</Text>
					</View>
				) : current && (current.status === "active" || current.status === "past_due") ? (
					<Button
						label="Cancelar assinatura"
						variant="danger"
						loading={cancel.isPending}
						onPress={onCancel}
					/>
				) : (
					<>
						<View className="gap-3">
							<Text className="text-sm font-semibold text-slate-700">Plano</Text>
							<View className="flex-row gap-3">
								{(["monthly", "annual"] as PlanId[]).map((p) => (
									<Pressable
										key={p}
										onPress={() => setPlanId(p)}
										className={`flex-1 rounded-xl border p-4 ${
											planId === p ? "border-blue-600 bg-blue-50" : "border-slate-300 bg-white"
										}`}
									>
										<Text className="text-base font-semibold text-slate-900">
											{p === "monthly" ? "Mensal" : "Anual"}
										</Text>
										<Text className="mt-1 text-sm text-slate-600">
											{formatMoney(priceOf(p), currency)}
											{p === "monthly" ? "/mês" : "/ano"}
										</Text>
									</Pressable>
								))}
							</View>
						</View>

						<View className="gap-3">
							<Text className="text-sm font-semibold text-slate-700">Moeda</Text>
							<View className="flex-row gap-3">
								{(["BRL", "USD"] as Currency[]).map((c) => (
									<Pressable
										key={c}
										onPress={() => {
											setCurrency(c);
											if (c === "USD") setMethod("card");
										}}
										className={`rounded-full border px-4 py-2 ${
											currency === c ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
										}`}
									>
										<Text
											className={`text-sm font-medium ${
												currency === c ? "text-white" : "text-slate-700"
											}`}
										>
											{c}
										</Text>
									</Pressable>
								))}
							</View>
						</View>

						<View className="gap-3">
							<Text className="text-sm font-semibold text-slate-700">Forma de pagamento</Text>
							<View className="flex-row gap-3">
								<Pressable
									onPress={() => setMethod("card")}
									className={`flex-1 rounded-xl border p-4 ${
										method === "card" ? "border-blue-600 bg-blue-50" : "border-slate-300 bg-white"
									}`}
								>
									<Text className="text-base font-semibold text-slate-900">Cartão de crédito</Text>
									<Text className="mt-1 text-xs text-slate-500">Renovação automática (Stripe)</Text>
								</Pressable>
								<Pressable
									onPress={() => currency === "BRL" && setMethod("pix")}
									disabled={currency !== "BRL"}
									className={`flex-1 rounded-xl border p-4 ${
										method === "pix" ? "border-blue-600 bg-blue-50" : "border-slate-300 bg-white"
									} ${currency !== "BRL" ? "opacity-40" : ""}`}
								>
									<Text className="text-base font-semibold text-slate-900">PIX</Text>
									<Text className="mt-1 text-xs text-slate-500">Somente BRL (AbacatePay)</Text>
								</Pressable>
							</View>
						</View>

						<Button
							label={`Assinar por ${formatMoney(priceOf(planId), currency)}`}
							loading={checkout.isPending}
							onPress={onSubscribe}
						/>

						{pix ? (
							<View className="gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
								<Text className="text-sm font-semibold text-slate-700">PIX copia e cola</Text>
								<Text selectable className="text-xs text-slate-600">
									{pix.code}
								</Text>
								<Text className="text-xs text-slate-400">
									Expira em {new Date(pix.expiresAt).toLocaleTimeString("pt-BR")}. A assinatura é
									liberada automaticamente após a confirmação.
								</Text>
								<Pressable onPress={() => subQuery.refetch()}>
									<Text className="text-sm font-semibold text-blue-600">
										Já paguei — atualizar status
									</Text>
								</Pressable>
							</View>
						) : null}
					</>
				)}

				<Pressable onPress={() => Linking.openURL("https://www.abacatepay.com")}>
					<Text className="text-center text-xs text-slate-300">
						Pagamentos processados por Stripe e AbacatePay
					</Text>
				</Pressable>
			</Animated.ScrollView>
		</SafeAreaView>
	);
}
