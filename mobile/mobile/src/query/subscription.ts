import type { CheckoutRequest } from "@op/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { repos } from "@/data";
import { qk } from "./client";

export function usePlans() {
	return useQuery({
		queryKey: qk.plans,
		queryFn: () => repos.subscriptions.plans(),
		staleTime: 60 * 60_000,
	});
}

export function useSubscription() {
	return useQuery({
		queryKey: qk.subscription,
		queryFn: () => repos.subscriptions.current(),
	});
}

export function useCheckout() {
	return useMutation({
		mutationFn: (input: CheckoutRequest) => repos.subscriptions.checkout(input),
	});
}

export function useCancelSubscription() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (atPeriodEnd: boolean) => repos.subscriptions.cancel({ atPeriodEnd }),
		onSuccess: (data) => qc.setQueryData(qk.subscription, data),
	});
}

export const billingSupported = repos.subscriptions.supportsBilling;
