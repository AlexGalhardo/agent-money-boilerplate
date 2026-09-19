import { apiKeyClient } from "@better-auth/api-key/client";
import { expoClient } from "@better-auth/expo/client";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { env } from "../config/env";

// Mesma sessão/cookie usada pelo frontend web e pelo bot — só o transporte
// muda: sem cookie jar de navegador no React Native, o plugin do Expo guarda
// o cookie no SecureStore e o reanexa em cada chamada (ver getCookie() em
// ./api.ts, usado pelo cliente Eden pra chamar as rotas fora de /auth/*).
export const authClient = createAuthClient({
	baseURL: env.apiUrl,
	basePath: "/auth",
	plugins: [expoClient({ scheme: "money", storage: SecureStore }), twoFactorClient(), apiKeyClient()],
});

export const { useSession, signIn, signUp, signOut, requestPasswordReset, resetPassword } = authClient;
