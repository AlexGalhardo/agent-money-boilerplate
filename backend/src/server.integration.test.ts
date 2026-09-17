import { beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "./config/prisma";
import { app } from "./server";

const ORIGIN = "http://localhost:4098";

function request(path: string, init: RequestInit & { cookie?: string } = {}): Promise<Response> {
	const { cookie, headers, ...rest } = init;
	return app.handle(
		new Request(`http://localhost${path}`, {
			...rest,
			headers: {
				"Content-Type": "application/json",
				Origin: ORIGIN,
				...(cookie ? { Cookie: cookie } : {}),
				...headers,
			},
		}),
	);
}

function sessionCookieFrom(response: Response): string {
	const setCookie = response.headers.get("set-cookie") ?? "";
	const match = setCookie.match(/better-auth\.session_token=[^;]+/);
	if (!match) throw new Error(`No session cookie in response: ${setCookie}`);
	return match[0];
}

describe("API integration", () => {
	let authCookie: string;
	let userId: string;

	beforeAll(async () => {
		const signup = await request("/auth/sign-up/email", {
			method: "POST",
			body: JSON.stringify({
				name: "Integration Test",
				email: "integration@example.com",
				password: "TestPass@123",
			}),
		});
		expect(signup.status).toBe(200);
		authCookie = sessionCookieFrom(signup);
		const body = (await signup.json()) as { user: { id: string } };
		userId = body.user.id;
	});

	it("GET / returns a health check", async () => {
		const response = await request("/");
		expect(response.status).toBe(200);
		const body = (await response.json()) as { success: boolean };
		expect(body.success).toBe(true);
	});

	it("GET /config exposes feature flags", async () => {
		const response = await request("/config");
		const body = (await response.json()) as {
			config: {
				enableConfirmEmail: boolean;
				enable2FA: boolean;
				enableAbacatepay: boolean;
				abacatepayPixTestMode: boolean;
			};
		};
		expect(response.status).toBe(200);
		expect(body.config).toEqual({
			enableConfirmEmail: false,
			enable2FA: false,
			enableAbacatepay: false,
			abacatepayPixTestMode: false,
		});
	});

	it("rejects duplicate signup with the same email", async () => {
		const response = await request("/auth/sign-up/email", {
			method: "POST",
			body: JSON.stringify({ name: "Dup", email: "integration@example.com", password: "TestPass@123" }),
		});
		expect(response.status).toBeGreaterThanOrEqual(400);
	});

	it("logs in with valid credentials", async () => {
		const response = await request("/auth/sign-in/email", {
			method: "POST",
			body: JSON.stringify({ email: "integration@example.com", password: "TestPass@123" }),
		});
		expect(response.status).toBe(200);
	});

	it("rejects login with a wrong password", async () => {
		const response = await request("/auth/sign-in/email", {
			method: "POST",
			body: JSON.stringify({ email: "integration@example.com", password: "wrong-password" }),
		});
		expect(response.status).toBeGreaterThanOrEqual(400);
	});

	it("blocks transaction routes without a session", async () => {
		const response = await request("/transactions");
		expect(response.status).toBe(401);
	});

	it("blocks transaction routes with an invalid session cookie", async () => {
		const response = await request("/transactions", { cookie: "better-auth.session_token=invalid" });
		expect(response.status).toBe(401);
	});

	it("rejects creating a transaction with a negative amount", async () => {
		const response = await request("/transactions", {
			method: "POST",
			cookie: authCookie,
			body: JSON.stringify({ description: "Invalid", amount: -100, category: "food", type: "expense" }),
		});
		expect(response.status).toBe(400);
	});

	it("rejects creating a transaction with an unknown category", async () => {
		const response = await request("/transactions", {
			method: "POST",
			cookie: authCookie,
			body: JSON.stringify({ description: "Invalid", amount: 100, category: "not-a-category", type: "expense" }),
		});
		expect(response.status).toBe(400);
	});

	it("performs full CRUD on a transaction, with data encrypted at rest", async () => {
		const create = await request("/transactions", {
			method: "POST",
			cookie: authCookie,
			body: JSON.stringify({ description: "Supermercado", amount: 15000, category: "food", type: "expense" }),
		});
		expect(create.status).toBe(201);
		const created = (await create.json()) as { transaction: { id: string; description: string; amount: number } };
		expect(created.transaction.description).toBe("Supermercado");
		expect(created.transaction.amount).toBe(15000);

		const raw = await prisma.transaction.findUniqueOrThrow({ where: { id: created.transaction.id } });
		expect(raw.description).not.toBe("Supermercado");
		expect(raw.amount).not.toBe("15000");

		const list = await request("/transactions?perPage=100", { cookie: authCookie });
		const listBody = (await list.json()) as { total: number; transactions: { id: string }[] };
		expect(listBody.transactions.some((t) => t.id === created.transaction.id)).toBe(true);

		const update = await request(`/transactions/${created.transaction.id}`, {
			method: "PUT",
			cookie: authCookie,
			body: JSON.stringify({ amount: 20000 }),
		});
		expect(update.status).toBe(200);
		const updated = (await update.json()) as { transaction: { amount: number } };
		expect(updated.transaction.amount).toBe(20000);

		const remove = await request(`/transactions/${created.transaction.id}`, {
			method: "DELETE",
			cookie: authCookie,
		});
		expect(remove.status).toBe(200);

		const getAfterDelete = await request(`/transactions/${created.transaction.id}`, { cookie: authCookie });
		expect(getAfterDelete.status).toBe(404);
	});

	it("returns category statistics that sum to 100% per type", async () => {
		const response = await request("/transactions/statistics", { cookie: authCookie });
		expect(response.status).toBe(200);
		const body = (await response.json()) as { stats: { type: string; percentage: number }[] };
		const expenseTotal = body.stats.filter((s) => s.type === "expense").reduce((sum, s) => sum + s.percentage, 0);
		expect(expenseTotal === 0 || Math.round(expenseTotal) === 100).toBe(true);
	});

	it("blocks account deletion while the plan is active", async () => {
		await prisma.user.update({ where: { id: userId }, data: { planStatus: "active" } });

		const response = await request("/users/me", { method: "DELETE", cookie: authCookie });
		expect(response.status).toBe(409);

		await prisma.user.update({ where: { id: userId }, data: { planStatus: "inactive" } });
	});

	it("requests a soft-delete (30-day grace) once there is no active plan, instead of deleting immediately", async () => {
		const response = await request("/users/me", { method: "DELETE", cookie: authCookie });
		expect(response.status).toBe(200);
		const body = (await response.json()) as { deletionRequestedAt: string };
		expect(body.deletionRequestedAt).toBeTruthy();

		const user = await prisma.user.findUnique({ where: { id: userId } });
		expect(user).not.toBeNull();
		expect(user?.deletionRequestedAt).not.toBeNull();
	});

	it("cancels a pending deletion request on the next login", async () => {
		const login = await request("/auth/sign-in/email", {
			method: "POST",
			body: JSON.stringify({ email: "integration@example.com", password: "TestPass@123" }),
		});
		expect(login.status).toBe(200);

		const user = await prisma.user.findUnique({ where: { id: userId } });
		expect(user?.deletionRequestedAt).toBeNull();
	});

	it("GET /payments/history returns an empty list before any payment attempt", async () => {
		const response = await request("/payments/history", { cookie: authCookie });
		expect(response.status).toBe(200);
		const body = (await response.json()) as { logs: unknown[] };
		expect(body.logs).toEqual([]);
	});

	it("POST /payments/pix/checkout responds 503 when AbacatePay is not configured", async () => {
		const response = await request("/payments/pix/checkout", {
			method: "POST",
			cookie: authCookie,
			body: JSON.stringify({ plan: "monthly" }),
		});
		expect(response.status).toBe(503);
	});

	it("POST /webhook/abacatepay responds 503 when AbacatePay is not configured", async () => {
		const response = await request("/webhook/abacatepay", {
			method: "POST",
			body: JSON.stringify({ event: "transparent.completed", data: { id: "ext-1" } }),
		});
		expect(response.status).toBe(503);
	});
});
