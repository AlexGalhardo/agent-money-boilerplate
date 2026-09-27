import { apiKeyClient } from "@better-auth/api-key/client";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// No `baseURL` on purpose: the client resolves to `window.location.origin`,
// and the frontend proxies `/auth/*` to the API (frontend/server.ts,
// vite.config.ts). Frontend and API are different Railway domains with no
// shared parent, so the session cookie can belong to only one of them;
// proxying makes the API's Set-Cookie land as the frontend's own, which is
// what lets `getServerSession` (requireAuth/redirectIfAuthenticated during
// SSR) see the session. Pointing `baseURL` at the API breaks that SSR.
//
// No onTwoFactorRedirect/twoFactorPage on purpose: 2FA is resolved in a modal
// on the login page itself (entrar.tsx), not by a full-page navigation.
export const authClient = createAuthClient({
	basePath: "/auth",
	plugins: [twoFactorClient(), apiKeyClient()],
});

export const { useSession, signIn, signUp, signOut, requestPasswordReset, resetPassword } = authClient;
