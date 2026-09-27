import { z } from "zod";

export const planIds = ["monthly", "annual"] as const;
export type PlanId = (typeof planIds)[number];

export const PLAN_DEFINITIONS: Record<PlanId, { amount: number; months: number; label: string }> = {
	monthly: { amount: 990, months: 1, label: "Mensal" },
	annual: { amount: 9990, months: 12, label: "Anual" },
};

export const createPixCheckoutSchema = z.object({
	plan: z.enum(planIds),
});

export const pixChargeIdParamSchema = z.object({
	id: z.uuid(),
});

export const webhookQuerySchema = z.object({
	webhookSecret: z.string().optional(),
});

export const webhookEventSchema = z.object({
	event: z.string().min(1).max(100),
	data: z.object({ id: z.string().min(1).max(200) }).loose(),
});

export type CreatePixCheckoutInput = z.infer<typeof createPixCheckoutSchema>;
export type WebhookEvent = z.infer<typeof webhookEventSchema>;
