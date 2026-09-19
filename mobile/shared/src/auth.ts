import { z } from "zod";

import { displayName, email, isoTimestamp, password, uuid } from "./common";

export const publicUser = z.object({
	id: uuid,
	email: z.string().email(),
	name: z.string(),
	twoFactorEnabled: z.boolean(),
	createdAt: isoTimestamp,
});
export type PublicUser = z.infer<typeof publicUser>;

/** Access token is short-lived; refresh token is rotated on every use. */
export const tokenPair = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
	/** Access-token lifetime in seconds, so the client can schedule a refresh. */
	expiresIn: z.number().int().positive(),
});
export type TokenPair = z.infer<typeof tokenPair>;

export const signUpRequest = z.object({
	email,
	password,
	name: displayName.optional(),
});
export type SignUpRequest = z.infer<typeof signUpRequest>;

export const signInRequest = z.object({
	email,
	password,
	/** Required only when the account has 2FA enabled. */
	totp: z
		.string()
		.regex(/^\d{6}$/, "Código deve ter 6 dígitos")
		.optional(),
});
export type SignInRequest = z.infer<typeof signInRequest>;

/**
 * When 2FA is on and no/invalid `totp` was sent, the backend answers 200 with
 * this body instead of a token pair, so the client can prompt for the code.
 */
export const twoFactorChallenge = z.object({
	twoFactorRequired: z.literal(true),
});
export type TwoFactorChallenge = z.infer<typeof twoFactorChallenge>;

export const signInResponse = z.union([z.object({ user: publicUser, tokens: tokenPair }), twoFactorChallenge]);
export type SignInResponse = z.infer<typeof signInResponse>;

export const authSession = z.object({ user: publicUser, tokens: tokenPair });
export type AuthSession = z.infer<typeof authSession>;

export const refreshRequest = z.object({ refreshToken: z.string().min(1) });
export type RefreshRequest = z.infer<typeof refreshRequest>;

export const googleSignInRequest = z.object({
	/** Google ID token (JWT) obtained on the device via expo-auth-session. */
	idToken: z.string().min(1),
});
export type GoogleSignInRequest = z.infer<typeof googleSignInRequest>;

export const forgotPasswordRequest = z.object({ email });
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequest>;

export const resetPasswordRequest = z.object({
	token: z.string().min(1),
	password,
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequest>;

export const updateProfileRequest = z.object({ name: displayName });
export type UpdateProfileRequest = z.infer<typeof updateProfileRequest>;

export const changePasswordRequest = z.object({
	currentPassword: z.string().min(1),
	newPassword: password,
});
export type ChangePasswordRequest = z.infer<typeof changePasswordRequest>;

export const messageResponse = z.object({ message: z.string() });
export type MessageResponse = z.infer<typeof messageResponse>;
