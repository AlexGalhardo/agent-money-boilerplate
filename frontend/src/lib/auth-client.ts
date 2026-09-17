import { apiKeyClient } from "@better-auth/api-key/client";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Sem `baseURL`: o cliente resolve pra `window.location.origin` sozinho, e o
// frontend faz proxy de `/auth/*` pra API (ver frontend/server.ts e
// vite.config.ts) — isso é essencial, não só estilo. Frontend e API são
// domínios diferentes no Railway (sem domínio-pai em comum), então o cookie
// de sessão só pode pertencer a UM dos dois; ao proxiar `/auth/*` pelo
// frontend, o Set-Cookie da API chega ao navegador como se fosse do próprio
// frontend, o que faz o `getServerSession` (usado por requireAuth/
// redirectIfAuthenticated durante SSR) enxergar a sessão corretamente.
// Apontar `baseURL` direto pra API aqui faria o cookie voltar a pertencer
// só à API, quebrando esse SSR de novo.
//
// Sem onTwoFactorRedirect/twoFactorPage de propósito: o 2FA é resolvido em um modal
// dentro da própria página de login (entrar.tsx), não por navegação de página inteira.
export const authClient = createAuthClient({
	basePath: "/auth",
	plugins: [twoFactorClient(), apiKeyClient()],
});

export const { useSession, signIn, signUp, signOut, requestPasswordReset, resetPassword } = authClient;
