import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { PageLayout } from "../components/page-layout";
import { useSession } from "../lib/auth-client";

export const Route = createFileRoute("/contato")({
	head: () => ({
		meta: [{ title: "Contato — Money" }, { name: "description", content: "Fale com o time da Money." }],
	}),
	component: ContactPage,
});

const MESSAGE_MAX_LENGTH = 512;

const subjectOptions = [
	{ value: "questions", label: "Dúvidas e Sugestões" },
	{ value: "bugs", label: "Problemas Técnicos e Bugs" },
	{ value: "payment", label: "Problemas com Pagamento" },
	{ value: "other", label: "Outros assuntos" },
] as const;

const contactSchema = z.object({
	name: z.string().trim().min(1, "Informe seu nome"),
	email: z.email("E-mail inválido"),
	subject: z.enum(subjectOptions.map((option) => option.value) as [string, ...string[]], {
		message: "Selecione um assunto",
	}),
	message: z
		.string()
		.trim()
		.min(10, "Sua mensagem precisa ter pelo menos 10 caracteres")
		.max(MESSAGE_MAX_LENGTH, `Sua mensagem precisa ter no máximo ${MESSAGE_MAX_LENGTH} caracteres`),
});

function ContactPage() {
	const { data: session } = useSession();
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [sent, setSent] = useState(false);
	const [messageLength, setMessageLength] = useState(0);

	function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const result = contactSchema.safeParse({
			name: formData.get("name"),
			email: formData.get("email"),
			subject: formData.get("subject"),
			message: formData.get("message"),
		});

		if (!result.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of result.error.issues) {
				const key = issue.path[0];
				if (typeof key === "string") fieldErrors[key] = issue.message;
			}
			setErrors(fieldErrors);
			return;
		}

		setErrors({});
		setSent(true);
		event.currentTarget.reset();
		setMessageLength(0);
	}

	return (
		<PageLayout>
			<section className="mx-auto max-w-xl px-4 py-16">
				<h1 className="text-3xl font-bold">Entre em Contato</h1>

				{sent && (
					<p role="status" className="mt-6 rounded-lg bg-brand-500/10 px-4 py-3 text-sm text-brand-600">
						Mensagem enviada com sucesso. Responderemos em breve.
					</p>
				)}

				<form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
					<div className="flex flex-col gap-1.5">
						<label htmlFor="name" className="text-sm font-medium">
							Nome
						</label>
						<input
							id="name"
							name="name"
							type="text"
							defaultValue={session?.user.name ?? ""}
							disabled={Boolean(session)}
							className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 outline-none focus:border-brand-500 disabled:opacity-60"
							aria-invalid={Boolean(errors.name)}
							aria-describedby={errors.name ? "name-error" : undefined}
						/>
						{errors.name && (
							<p id="name-error" className="text-sm text-red-500">
								{errors.name}
							</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<label htmlFor="email" className="text-sm font-medium">
							E-mail
						</label>
						<input
							id="email"
							name="email"
							type="email"
							defaultValue={session?.user.email ?? ""}
							disabled={Boolean(session)}
							className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 outline-none focus:border-brand-500 disabled:opacity-60"
							aria-invalid={Boolean(errors.email)}
							aria-describedby={errors.email ? "email-error" : undefined}
						/>
						{errors.email && (
							<p id="email-error" className="text-sm text-red-500">
								{errors.email}
							</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<label htmlFor="subject" className="text-sm font-medium">
							Assunto
						</label>
						<select
							id="subject"
							name="subject"
							defaultValue=""
							className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 outline-none focus:border-brand-500"
							aria-invalid={Boolean(errors.subject)}
							aria-describedby={errors.subject ? "subject-error" : undefined}
						>
							<option value="" disabled>
								Selecione um assunto
							</option>
							{subjectOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
						{errors.subject && (
							<p id="subject-error" className="text-sm text-red-500">
								{errors.subject}
							</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<div className="flex items-center justify-between">
							<label htmlFor="message" className="text-sm font-medium">
								Mensagem
							</label>
							<span className="text-xs text-(--color-fg-muted)">
								{messageLength}/{MESSAGE_MAX_LENGTH}
							</span>
						</div>
						<textarea
							id="message"
							name="message"
							rows={5}
							maxLength={MESSAGE_MAX_LENGTH}
							onChange={(event) => setMessageLength(event.target.value.length)}
							className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 outline-none focus:border-brand-500"
							aria-invalid={Boolean(errors.message)}
							aria-describedby={errors.message ? "message-error" : undefined}
						/>
						{errors.message && (
							<p id="message-error" className="text-sm text-red-500">
								{errors.message}
							</p>
						)}
					</div>

					<button
						type="submit"
						className="mt-2 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-black hover:bg-brand-400"
					>
						Enviar mensagem
					</button>
				</form>
			</section>
		</PageLayout>
	);
}
