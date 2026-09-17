import { env } from "../config/env";

const BASE_URL = "https://api.abacatepay.com/v2";

export class AbacatePayNotConfiguredError extends Error {
	constructor() {
		super("AbacatePay não está configurado (ENABLE_ABACATEPAY=false ou ABACATEPAY_API_KEY ausente)");
		this.name = "AbacatePayNotConfiguredError";
	}
}

export class AbacatePayRequestError extends Error {
	constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "AbacatePayRequestError";
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

// ABACATEPAY_PIX_TEST_MODE liga o fluxo de sandbox (chave de dev + endpoint
// de simulação de pagamento) sem depender do feature flag geral
// ENABLE_ABACATEPAY — assim o checkout PIX funciona em ambiente de teste
// mesmo com pagamentos "de verdade" desligados.
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

	const body = (await response.json()) as ApiEnvelope<T>;

	if (!response.ok || !body.success) {
		throw new AbacatePayRequestError(response.status, body.error ?? `Falha na requisição à AbacatePay (${path})`);
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

	// A AbacatePay espera o id como query param aqui (não no corpo) —
	// mesmo padrão de /transparents/check, apesar do método ser POST.
	async simulatePayment(id: string): Promise<PixCharge> {
		return request<PixCharge>(`/transparents/simulate-payment?id=${encodeURIComponent(id)}`, {
			method: "POST",
		});
	},
};
