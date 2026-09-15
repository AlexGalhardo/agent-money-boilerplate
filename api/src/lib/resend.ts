import { Resend } from "resend";
import { env } from "../config/env";

export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail(params: { to: string; subject: string; html: string; text?: string }): Promise<void> {
	if (!resend || !env.RESEND_FROM_EMAIL) {
		console.warn(
			`[email] Resend não configurado — e-mail para ${params.to} ("${params.subject}") não foi enviado.`,
		);
		return;
	}

	await resend.emails.send({
		from: env.RESEND_FROM_EMAIL,
		to: params.to,
		subject: params.subject,
		html: params.html,
		...(params.text ? { text: params.text } : {}),
	});
}
