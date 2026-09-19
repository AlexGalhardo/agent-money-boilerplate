import type { PublicUser, SignInResponse } from "@op/shared";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { repos } from "@/data";

type AuthContextValue = {
	user: PublicUser | null;
	initializing: boolean;
	/** Returns the raw result so the login screen can branch on `twoFactorRequired`. */
	signIn: (email: string, password: string, totp?: string) => Promise<SignInResponse>;
	signUp: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	updateName: (name: string) => Promise<void>;
	changePassword: (current: string, next: string) => Promise<void>;
	refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<PublicUser | null>(null);
	const [initializing, setInitializing] = useState(true);
	const queryClient = useQueryClient();

	useEffect(() => {
		let active = true;
		repos.auth
			.restore()
			.then((res) => {
				if (active) setUser(res?.user ?? null);
			})
			.catch(() => {
				if (active) setUser(null);
			})
			.finally(() => {
				if (active) setInitializing(false);
			});
		return () => {
			active = false;
		};
	}, []);

	const value = useMemo<AuthContextValue>(
		() => ({
			user,
			initializing,
			signIn: async (email, password, totp) => {
				const res = await repos.auth.signIn({ email, password, totp });
				if ("user" in res) {
					setUser(res.user);
					await queryClient.invalidateQueries();
				}
				return res;
			},
			signUp: async (email, password) => {
				const res = await repos.auth.signUp({ email, password });
				setUser(res.user);
				await queryClient.invalidateQueries();
			},
			signOut: async () => {
				await repos.auth.signOut();
				setUser(null);
				queryClient.clear();
			},
			updateName: async (name) => {
				setUser(await repos.auth.updateName(name));
			},
			changePassword: async (current, next) => {
				await repos.auth.changePassword(current, next);
			},
			refreshUser: async () => {
				try {
					setUser(await repos.auth.me());
				} catch {
					setUser(null);
				}
			},
		}),
		[user, initializing, queryClient],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) {
		throw new Error("useAuth deve ser usado dentro de AuthProvider.");
	}
	return ctx;
}
