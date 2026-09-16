import { apiKeyClient } from "@better-auth/api-key/client";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// Sem onTwoFactorRedirect/twoFactorPage de propósito: o 2FA é resolvido em um modal
// dentro da própria página de login (entrar.tsx), não por navegação de página inteira.
export const authClient = createAuthClient({
	baseURL: API_URL,
	plugins: [twoFactorClient(), apiKeyClient()],
});

export const { useSession, signIn, signUp, signOut, requestPasswordReset, resetPassword } = authClient;
