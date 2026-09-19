import { z } from "zod";

/** Returned when the user starts 2FA enrollment; secret is shown once. */
export const twoFactorSetupResponse = z.object({
	secret: z.string(),
	/** otpauth:// URI for QR rendering. */
	otpauthUrl: z.string(),
});
export type TwoFactorSetupResponse = z.infer<typeof twoFactorSetupResponse>;

export const twoFactorVerifyRequest = z.object({
	code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos"),
});
export type TwoFactorVerifyRequest = z.infer<typeof twoFactorVerifyRequest>;

/** After enabling 2FA the user gets one-time recovery codes. */
export const twoFactorEnableResponse = z.object({
	recoveryCodes: z.array(z.string()),
});
export type TwoFactorEnableResponse = z.infer<typeof twoFactorEnableResponse>;

export const twoFactorDisableRequest = z.object({
	/** A valid TOTP or one of the recovery codes. */
	code: z.string().min(6),
});
export type TwoFactorDisableRequest = z.infer<typeof twoFactorDisableRequest>;
