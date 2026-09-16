import { beforeEach, describe, expect, it, mock } from "bun:test";

const abacatepayMock = {
	createPixCharge: mock(),
	checkPixCharge: mock(),
	simulatePayment: mock(),
};

const prismaMock = {
	user: { findUniqueOrThrow: mock(), update: mock(), updateMany: mock() },
	pixCharge: { create: mock(), findFirst: mock(), findUnique: mock(), findUniqueOrThrow: mock(), update: mock() },
	paymentLog: { upsert: mock() },
	$transaction: mock(async (ops: Promise<unknown>[]) => Promise.all(ops)),
};

const envMock = { ABACATEPAY_PIX_TEST_MODE: false };

mock.module("../../lib/abacatepay", () => ({
	abacatepay: abacatepayMock,
	AbacatePayNotConfiguredError: class AbacatePayNotConfiguredError extends Error {},
}));
mock.module("../../config/prisma", () => ({ prisma: prismaMock }));
mock.module("../../config/env", () => ({ env: envMock }));

const { paymentService, PixChargeNotFoundError, PixTestModeDisabledError } = await import("./payment.service");

function mockFreeUser(): void {
	prismaMock.user.findUniqueOrThrow.mockResolvedValue({
		id: "user-1",
		planStatus: "inactive",
		planExpiresAt: null,
	});
}

function buildCharge(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: "charge-1",
		userId: "user-1",
		externalId: "ext-1",
		plan: "monthly",
		amount: 990,
		status: "pending",
		expiresAt: new Date(Date.now() + 60_000),
		...overrides,
	};
}

describe("paymentService", () => {
	beforeEach(() => {
		for (const fn of Object.values(abacatepayMock)) fn.mockReset();
		for (const group of Object.values(prismaMock)) {
			if (typeof group === "function") continue;
			for (const fn of Object.values(group)) fn.mockReset();
		}
		prismaMock.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
		envMock.ABACATEPAY_PIX_TEST_MODE = false;
		mockFreeUser();
	});

	describe("createPixCheckout", () => {
		it("creates a PIX charge with the plan amount and logs it", async () => {
			abacatepayMock.createPixCharge.mockResolvedValue({
				id: "ext-1",
				status: "PENDING",
				brCode: "00020126...",
				brCodeBase64: "iVBORw0KGgo=",
				expiresAt: "2026-01-01T00:30:00.000Z",
			});
			prismaMock.pixCharge.create.mockResolvedValue({ id: "internal-charge-1" });
			prismaMock.paymentLog.upsert.mockResolvedValue({});

			const result = await paymentService.createPixCheckout("user-1", "monthly");

			expect(abacatepayMock.createPixCharge).toHaveBeenCalledWith(
				expect.objectContaining({ amount: 990, expiresIn: 30 * 60 }),
			);
			expect(prismaMock.pixCharge.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						userId: "user-1",
						externalId: "ext-1",
						plan: "monthly",
						amount: 990,
					}),
				}),
			);
			expect(prismaMock.paymentLog.upsert).toHaveBeenCalled();
			// O id retornado deve ser o id INTERNO do PixCharge (usado depois por
			// getCheckoutStatus/simulateCheckout), nunca o externalId da AbacatePay.
			expect(result).toEqual({
				id: "internal-charge-1",
				brCode: "00020126...",
				brCodeBase64: "iVBORw0KGgo=",
				expiresAt: "2026-01-01T00:30:00.000Z",
			});
		});

		it("uses the annual plan amount for the annual plan", async () => {
			abacatepayMock.createPixCharge.mockResolvedValue({
				id: "ext-2",
				status: "PENDING",
				brCode: "code",
				brCodeBase64: "base64",
				expiresAt: "2026-01-01T00:30:00.000Z",
			});
			prismaMock.pixCharge.create.mockResolvedValue({});
			prismaMock.paymentLog.upsert.mockResolvedValue({});

			await paymentService.createPixCheckout("user-1", "annual");

			expect(abacatepayMock.createPixCharge).toHaveBeenCalledWith(expect.objectContaining({ amount: 9990 }));
		});
	});

	describe("getCheckoutStatus", () => {
		it("throws when the charge does not belong to the user", async () => {
			prismaMock.pixCharge.findFirst.mockResolvedValue(null);

			await expect(paymentService.getCheckoutStatus("user-1", "charge-x")).rejects.toThrow(
				PixChargeNotFoundError,
			);
		});

		it("marks an unpaid, past-expiry charge as expired without calling AbacatePay", async () => {
			prismaMock.pixCharge.findFirst.mockResolvedValue(buildCharge({ expiresAt: new Date(Date.now() - 1000) }));
			prismaMock.pixCharge.update.mockResolvedValue({});
			prismaMock.pixCharge.findUniqueOrThrow.mockResolvedValue(buildCharge({ status: "expired" }));
			prismaMock.paymentLog.upsert.mockResolvedValue({});

			const result = await paymentService.getCheckoutStatus("user-1", "charge-1");

			expect(abacatepayMock.checkPixCharge).not.toHaveBeenCalled();
			expect(prismaMock.pixCharge.update).toHaveBeenCalledWith({
				where: { id: "charge-1" },
				data: { status: "expired" },
			});
			expect(result.status).toBe("expired");
		});

		it("logs a pix.expired payment event when a pending charge has expired", async () => {
			prismaMock.pixCharge.findFirst.mockResolvedValue(buildCharge({ expiresAt: new Date(Date.now() - 1000) }));
			prismaMock.pixCharge.update.mockResolvedValue({});
			prismaMock.pixCharge.findUniqueOrThrow.mockResolvedValue(buildCharge({ status: "expired" }));
			prismaMock.paymentLog.upsert.mockResolvedValue({});

			await paymentService.getCheckoutStatus("user-1", "charge-1");

			expect(prismaMock.paymentLog.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { externalId: "ext-1" },
					create: expect.objectContaining({ eventType: "pix.expired", status: "expired" }),
					update: expect.objectContaining({ status: "expired" }),
				}),
			);
		});

		it("activates the plan once AbacatePay confirms the charge as PAID", async () => {
			prismaMock.pixCharge.findFirst.mockResolvedValue(buildCharge());
			abacatepayMock.checkPixCharge.mockResolvedValue({ id: "ext-1", status: "PAID" });
			prismaMock.pixCharge.findUniqueOrThrow.mockResolvedValue(buildCharge({ status: "paid" }));
			prismaMock.paymentLog.upsert.mockResolvedValue({});

			const result = await paymentService.getCheckoutStatus("user-1", "charge-1");

			expect(prismaMock.$transaction).toHaveBeenCalled();
			expect(prismaMock.user.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "user-1" },
					data: expect.objectContaining({ planStatus: "active" }),
				}),
			);
			expect(result.status).toBe("paid");
		});

		it("leaves the charge pending when AbacatePay still reports it unpaid", async () => {
			prismaMock.pixCharge.findFirst.mockResolvedValue(buildCharge());
			abacatepayMock.checkPixCharge.mockResolvedValue({ id: "ext-1", status: "PENDING" });
			prismaMock.pixCharge.findUniqueOrThrow.mockResolvedValue(buildCharge({ status: "pending" }));

			const result = await paymentService.getCheckoutStatus("user-1", "charge-1");

			expect(prismaMock.user.update).not.toHaveBeenCalled();
			expect(result.status).toBe("pending");
		});
	});

	describe("simulateCheckout", () => {
		it("throws when ABACATEPAY_PIX_TEST_MODE is disabled", async () => {
			envMock.ABACATEPAY_PIX_TEST_MODE = false;

			await expect(paymentService.simulateCheckout("user-1", "charge-1")).rejects.toThrow(
				PixTestModeDisabledError,
			);
			expect(prismaMock.pixCharge.findFirst).not.toHaveBeenCalled();
		});

		it("throws when the charge does not belong to the user", async () => {
			envMock.ABACATEPAY_PIX_TEST_MODE = true;
			prismaMock.pixCharge.findFirst.mockResolvedValue(null);

			await expect(paymentService.simulateCheckout("user-1", "charge-x")).rejects.toThrow(PixChargeNotFoundError);
		});

		it("simulates the payment and activates the plan", async () => {
			envMock.ABACATEPAY_PIX_TEST_MODE = true;
			prismaMock.pixCharge.findFirst.mockResolvedValue(buildCharge());
			abacatepayMock.simulatePayment.mockResolvedValue({ id: "ext-1", status: "PAID" });
			prismaMock.paymentLog.upsert.mockResolvedValue({});

			await paymentService.simulateCheckout("user-1", "charge-1");

			expect(abacatepayMock.simulatePayment).toHaveBeenCalledWith("ext-1");
			expect(prismaMock.user.update).toHaveBeenCalledWith(
				expect.objectContaining({ data: expect.objectContaining({ planStatus: "active" }) }),
			);
		});
	});

	describe("handleWebhookEvent", () => {
		it("ignores events for charges it does not recognize", async () => {
			prismaMock.pixCharge.findUnique.mockResolvedValue(null);

			await paymentService.handleWebhookEvent({ event: "transparent.completed", data: { id: "unknown" } });

			expect(prismaMock.user.update).not.toHaveBeenCalled();
		});

		it("activates the plan on transparent.completed", async () => {
			prismaMock.pixCharge.findUnique.mockResolvedValue(buildCharge());
			prismaMock.paymentLog.upsert.mockResolvedValue({});

			await paymentService.handleWebhookEvent({ event: "transparent.completed", data: { id: "ext-1" } });

			expect(prismaMock.user.update).toHaveBeenCalledWith(
				expect.objectContaining({ data: expect.objectContaining({ planStatus: "active" }) }),
			);
		});

		it("marks the charge as failed on transparent.refunded", async () => {
			prismaMock.pixCharge.findUnique.mockResolvedValue(buildCharge());
			prismaMock.pixCharge.update.mockResolvedValue({});
			prismaMock.paymentLog.upsert.mockResolvedValue({});

			await paymentService.handleWebhookEvent({ event: "transparent.refunded", data: { id: "ext-1" } });

			expect(prismaMock.pixCharge.update).toHaveBeenCalledWith({
				where: { id: "charge-1" },
				data: { status: "failed" },
			});
		});
	});

	describe("checkExpiredPlans", () => {
		it("marks active plans past their expiry date as expired", async () => {
			prismaMock.user.updateMany.mockResolvedValue({ count: 3 });

			const result = await paymentService.checkExpiredPlans();

			expect(result).toBe(3);
			expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
				expect.objectContaining({ where: expect.objectContaining({ planStatus: "active" }) }),
			);
		});
	});
});
