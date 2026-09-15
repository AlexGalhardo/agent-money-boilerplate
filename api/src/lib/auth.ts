import { render } from "@react-email/render";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { ResetPasswordEmail } from "../emails/reset-password";
import { TwoFactorOtpEmail } from "../emails/two-factor-otp";
import { VerifyEmail } from "../emails/verify-email";
import { sendEmail } from "./resend";

export const auth = betterAuth({
	baseURL: env.APP_URL,
	basePath: "/api/auth",
	secret: env.BETTER_AUTH_SECRET,
	trustedOrigins: [env.FRONTEND_URL],
	database: prismaAdapter(prisma, {
		provider: env.DATABASE_PROVIDER,
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: env.ENABLE_CONFIRM_EMAIL,
		sendResetPassword: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				subject: "Redefinir sua senha",
				html: await render(ResetPasswordEmail({ resetUrl: url })),
			});
		},
	},
	emailVerification: {
		sendOnSignUp: env.ENABLE_CONFIRM_EMAIL,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				subject: "Confirme seu e-mail",
				html: await render(VerifyEmail({ verifyUrl: url })),
			});
		},
	},
	socialProviders: {
		...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
			? {
					google: {
						clientId: env.GOOGLE_CLIENT_ID,
						clientSecret: env.GOOGLE_CLIENT_SECRET,
					},
				}
			: {}),
	},
	plugins: [
		...(env.ENABLE_2FA
			? [
					twoFactor({
						issuer: "Elysia Finanças",
						otpOptions: {
							async sendOTP({ user, otp }) {
								await sendEmail({
									to: user.email,
									subject: "Seu código de verificação",
									html: await render(TwoFactorOtpEmail({ code: otp })),
								});
							},
						},
					}),
				]
			: []),
	],
	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
	},
	databaseHooks: {
		session: {
			create: {
				// Login (e-mail/senha ou Google) dentro dos 30 dias de carência
				// cancela um pedido de exclusão de conta pendente (Fase 6).
				async after(session) {
					await prisma.user.updateMany({
						where: { id: session.userId, deletionRequestedAt: { not: null } },
						data: { deletionRequestedAt: null },
					});
				},
			},
		},
	},
});

export type Auth = typeof auth;
