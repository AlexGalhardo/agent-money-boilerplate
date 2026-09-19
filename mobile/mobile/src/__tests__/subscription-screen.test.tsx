import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

const mockCheckout = jest.fn(async () => ({
	provider: "stripe",
	checkoutUrl: "https://checkout.stripe.test/x",
	subscriptionId: "s1",
}));
const mockCancel = jest.fn();

jest.mock("expo-router", () => ({
	useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));

jest.mock("@/query/subscription", () => ({
	billingSupported: true,
	usePlans: () => ({
		data: {
			plans: [
				{
					id: "monthly",
					label: "Mensal",
					interval: "month",
					prices: [
						{ currency: "BRL", amountCents: 499 },
						{ currency: "USD", amountCents: 299 },
					],
				},
				{
					id: "annual",
					label: "Anual",
					interval: "year",
					prices: [
						{ currency: "BRL", amountCents: 4990 },
						{ currency: "USD", amountCents: 2990 },
					],
				},
			],
		},
	}),
	useSubscription: () => ({
		data: { subscription: null, isPremium: false },
		isPending: false,
		refetch: jest.fn(),
	}),
	useCheckout: () => ({ mutateAsync: mockCheckout, isPending: false }),
	useCancelSubscription: () => ({ mutate: mockCancel, isPending: false }),
}));

import SubscriptionScreen from "@/app/(app)/subscription";

describe("SubscriptionScreen", () => {
	beforeEach(() => jest.clearAllMocks());

	it("renders both plans with BRL prices and starts a Stripe checkout", async () => {
		render(<SubscriptionScreen />);

		expect(screen.getByText("R$ 4,99/mês")).toBeOnTheScreen();
		expect(screen.getByText("R$ 49,90/ano")).toBeOnTheScreen();

		// Default selection is monthly + card.
		fireEvent.press(screen.getByText("Assinar por R$ 4,99"));

		await waitFor(() =>
			expect(mockCheckout).toHaveBeenCalledWith({
				planId: "monthly",
				currency: "BRL",
				paymentMethod: "card",
			}),
		);
	});

	it("switches the price when the annual plan is picked", () => {
		render(<SubscriptionScreen />);
		fireEvent.press(screen.getByText("Anual"));
		expect(screen.getByText("Assinar por R$ 49,90")).toBeOnTheScreen();
	});

	it("disables PIX for USD", async () => {
		render(<SubscriptionScreen />);
		fireEvent.press(screen.getByText("USD"));
		// PIX becomes non-selectable; card stays the method, button keeps USD price.
		fireEvent.press(screen.getByText("PIX"));
		fireEvent.press(screen.getByText("Assinar por $2.99"));
		await waitFor(() =>
			expect(mockCheckout).toHaveBeenCalledWith(
				expect.objectContaining({ currency: "USD", paymentMethod: "card" }),
			),
		);
	});
});
