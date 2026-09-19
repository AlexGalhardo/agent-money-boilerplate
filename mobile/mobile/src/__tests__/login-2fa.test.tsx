import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type React from "react";

const mockReplace = jest.fn();
const mockSignIn = jest.fn();

jest.mock("expo-router", () => {
	const { Text } = require("react-native");
	return {
		useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
		Link: ({ children }: { children: React.ReactNode }) => require("react").createElement(Text, null, children),
	};
});

jest.mock("@/context/auth", () => ({
	useAuth: () => ({ signIn: mockSignIn }),
}));

import LoginScreen from "@/app/(auth)/login";

describe("LoginScreen — 2FA challenge", () => {
	beforeEach(() => jest.clearAllMocks());

	it("prompts for a code when the backend returns a 2FA challenge, then logs in", async () => {
		mockSignIn
			.mockResolvedValueOnce({ twoFactorRequired: true })
			.mockResolvedValueOnce({ user: { id: "1" }, tokens: {} });

		render(<LoginScreen />);

		fireEvent.changeText(screen.getByPlaceholderText("voce@exemplo.com"), "a@b.com");
		fireEvent.changeText(screen.getByPlaceholderText("Sua senha"), "secret123");
		fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

		await waitFor(() => expect(screen.getByPlaceholderText("123456")).toBeOnTheScreen());
		expect(mockReplace).not.toHaveBeenCalled();

		fireEvent.changeText(screen.getByPlaceholderText("123456"), "123456");
		fireEvent.press(screen.getByRole("button", { name: "Verificar" }));

		await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard"));
		expect(mockSignIn).toHaveBeenLastCalledWith("a@b.com", "secret123", "123456");
	});

	it("shows an error message when credentials are rejected", async () => {
		mockSignIn.mockRejectedValueOnce(new Error("E-mail ou senha incorretos."));
		render(<LoginScreen />);

		fireEvent.changeText(screen.getByPlaceholderText("voce@exemplo.com"), "a@b.com");
		fireEvent.changeText(screen.getByPlaceholderText("Sua senha"), "nope123");
		fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

		await waitFor(() => expect(screen.getByText("E-mail ou senha incorretos.")).toBeOnTheScreen());
	});
});
