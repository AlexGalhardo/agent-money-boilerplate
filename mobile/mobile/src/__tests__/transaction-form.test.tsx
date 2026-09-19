import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

const mockBack = jest.fn();
const mockCreate = jest.fn(async () => ({ id: "new-id" }));
const mockUpdate = jest.fn(async () => ({}));

jest.mock("expo-router", () => ({
	useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }),
	useLocalSearchParams: () => ({ id: "new" }),
}));

jest.mock("@/query/transactions", () => ({
	useTransactionQuery: () => ({ data: undefined, isPending: false }),
	useCreateTransaction: () => ({ mutateAsync: mockCreate, isPending: false }),
	useUpdateTransaction: () => ({ mutateAsync: mockUpdate, isPending: false }),
	useDeleteTransaction: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

import TransactionFormScreen from "@/app/(app)/transaction/[id]";

describe("TransactionFormScreen (create)", () => {
	beforeEach(() => jest.clearAllMocks());

	it("creates a transaction from the entered amount and category", async () => {
		render(<TransactionFormScreen />);

		// The BRL mask reads digits as cents: "2500" -> R$ 25,00
		fireEvent.changeText(screen.getByPlaceholderText("R$ 0,00"), "2500");
		fireEvent.press(screen.getByText("Mercado"));
		fireEvent.press(screen.getByText("Adicionar"));

		await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "expense",
				amountCents: 2500,
				category: "Mercado",
				date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
			}),
		);
		expect(mockBack).toHaveBeenCalled();
	});

	it("blocks submit when the amount is below the minimum", async () => {
		render(<TransactionFormScreen />);
		fireEvent.press(screen.getByText("Adicionar"));

		await waitFor(() => expect(screen.getByText("O valor mínimo é R$ 0,01.")).toBeOnTheScreen());
		expect(mockCreate).not.toHaveBeenCalled();
	});
});
