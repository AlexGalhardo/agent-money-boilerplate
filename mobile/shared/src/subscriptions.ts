import { z } from "zod";

import { isoTimestamp, uuid } from "./common";

export const planId = z.enum(["monthly", "annual"]);
export type PlanId = z.infer<typeof planId>;

export const currency = z.enum(["BRL", "USD"]);
export type Currency = z.infer<typeof currency>;

/** `card` is billed by Stripe (recurring); `pix` by AbacatePay (renew-by-invoice). */
export const paymentMethod = z.enum(["card", "pix"]);
export type PaymentMethod = z.infer<typeof paymentMethod>;

export const subscriptionStatus = z.enum([
	"incomplete", // checkout created, no payment yet
	"pending", // PIX invoice issued, awaiting confirmation
	"active",
	"past_due",
	"canceled", // will end at period end
	"expired", // period ended without renewal
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatus>;

/** Canonical price table. Amounts are integer cents in the plan's currency. */
export const PLAN_PRICING: Record<PlanId, Record<Currency, number>> = {
	monthly: { BRL: 499, USD: 299 },
	annual: { BRL: 4990, USD: 2990 },
};

export const PLAN_INTERVAL_DAYS: Record<PlanId, number> = {
	monthly: 30,
	annual: 365,
};

export const plan = z.object({
	id: planId,
	label: z.string(),
	interval: z.enum(["month", "year"]),
	prices: z.array(z.object({ currency, amountCents: z.number().int().positive() })),
});
export type Plan = z.infer<typeof plan>;

export const plansResponse = z.object({ plans: z.array(plan) });
export type PlansResponse = z.infer<typeof plansResponse>;

export const subscription = z.object({
	id: uuid,
	planId,
	status: subscriptionStatus,
	paymentMethod,
	currency,
	amountCents: z.number().int().positive(),
	currentPeriodStart: isoTimestamp.nullable(),
	currentPeriodEnd: isoTimestamp.nullable(),
	cancelAtPeriodEnd: z.boolean(),
	canceledAt: isoTimestamp.nullable(),
	createdAt: isoTimestamp,
	updatedAt: isoTimestamp,
});
export type Subscription = z.infer<typeof subscription>;

/** `null` means the user has never subscribed. */
export const subscriptionResponse = z.object({
	subscription: subscription.nullable(),
	/** Convenience flag the app uses to gate premium features. */
	isPremium: z.boolean(),
});
export type SubscriptionResponse = z.infer<typeof subscriptionResponse>;

export const checkoutRequest = z.object({
	planId,
	currency,
	paymentMethod,
});
export type CheckoutRequest = z.infer<typeof checkoutRequest>;

export const cardCheckoutResponse = z.object({
	provider: z.literal("stripe"),
	/** Stripe Checkout URL to open in a browser. */
	checkoutUrl: z.string().url(),
	subscriptionId: uuid,
});

export const pixCheckoutResponse = z.object({
	provider: z.literal("abacatepay"),
	subscriptionId: uuid,
	billingId: z.string(),
	/** PIX copy-and-paste payload (BR Code). */
	pixCode: z.string(),
	/** Base64 PNG of the QR code, ready for <Image source={{ uri }}>. */
	pixQrImage: z.string(),
	amountCents: z.number().int().positive(),
	expiresAt: isoTimestamp,
});

export const checkoutResponse = z.discriminatedUnion("provider", [cardCheckoutResponse, pixCheckoutResponse]);
export type CheckoutResponse = z.infer<typeof checkoutResponse>;

export const cancelSubscriptionRequest = z.object({
	/** false ends immediately; true (default) lets the paid period run out. */
	atPeriodEnd: z.boolean().default(true),
});
export type CancelSubscriptionRequest = z.infer<typeof cancelSubscriptionRequest>;
