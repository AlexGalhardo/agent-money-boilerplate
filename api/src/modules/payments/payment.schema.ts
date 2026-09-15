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

export type CreatePixCheckoutInput = z.infer<typeof createPixCheckoutSchema>;
