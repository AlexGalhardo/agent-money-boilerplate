import { env } from "../config/env";
import { AppError } from "./errors";

const BASE_URL = "https://api.abacatepay.com/v2";

export class AbacatePayNotConfiguredError extends AppError {
	constructor() {
		super("Pagamentos PIX indisponíveis no momento", 503);
	}
}

/** Upstream failure — answered as 502 so it is never mistaken for a client error. */
export class AbacatePayRequestError extends AppError {
	constructor(
		public readonly upstreamStatus: number,
		message: string,
	) {
		super(message, 502);
	}
}

export type PixCharge = {
	id: string;
	status: string;
	brCode: string;
	brCodeBase64: string;
	expiresAt: string;
};

type ApiEnvelope<T> = { data: T; success: boolean; error: string | null };

// ABACATEPAY_PIX_TEST_MODE enables the sandbox flow (dev key + payment
// simulation endpoint) independently of ENABLE_ABACATEPAY, so PIX checkout
// works in test environments with real payments switched off.
function requireApiKey(): string {
	if (!env.ABACATEPAY_API_KEY || (!env.ENABLE_ABACATEPAY && !env.ABACATEPAY_PIX_TEST_MODE)) {
		throw new AbacatePayNotConfiguredError();
	}
	return env.ABACATEPAY_API_KEY;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
	const apiKey = requireApiKey();

	const response = await fetch(`${BASE_URL}${path}`, {
		...init,
		headers: { ...init.headers, Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
	});

	const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

	if (!response.ok || !body?.success) {
		console.error(`[abacatepay] ${path} failed with ${response.status}: ${body?.error ?? "no body"}`);
		throw new AbacatePayRequestError(response.status, "Falha ao comunicar com o provedor de pagamentos");
	}

	return body.data;
}

export const abacatepay = {
	async createPixCharge(input: {
		amount: number;
		description: string;
		expiresIn: number;
		metadata?: Record<string, unknown>;
	}): Promise<PixCharge> {
		return request<PixCharge>("/transparents/create", {
			method: "POST",
			body: JSON.stringify({
				method: "PIX",
				data: {
					amount: input.amount,
					description: input.description,
					expiresIn: input.expiresIn,
					metadata: input.metadata,
				},
			}),
		});
	},

	async checkPixCharge(id: string): Promise<PixCharge> {
		return request<PixCharge>(`/transparents/check?id=${encodeURIComponent(id)}`, { method: "GET" });
	},

	// AbacatePay expects the id as a query param here (not in the body) —
	// same as /transparents/check, even though this one is a POST.
	async simulatePayment(id: string): Promise<PixCharge> {
		return request<PixCharge>(`/transparents/simulate-payment?id=${encodeURIComponent(id)}`, {
			method: "POST",
		});
	},
};
