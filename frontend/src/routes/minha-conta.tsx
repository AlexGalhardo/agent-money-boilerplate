import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { FormField, inputClassName } from "../components/auth-card";
import { DeleteAccountSection } from "../components/delete-account-section";
import { PageLayout } from "../components/page-layout";
import { TwoFactorSettings } from "../components/two-factor-settings";
import { api } from "../lib/api";
import { authClient, signOut, useSession } from "../lib/auth-client";
import { FREE_TRANSACTION_LIMIT, hasActivePlan } from "../lib/plan";
import { requireAuth } from "../lib/require-auth";
import { useAppConfig } from "../lib/use-app-config";

export const Route = createFileRoute("/minha-conta")({
	head: () => ({ meta: [{ title: "Minha conta — Elysia Finanças" }] }),
	beforeLoad: requireAuth,
	component: ProfilePage,
});

const nameSchema = z.object({ name: z.string().trim().min(1, "Informe seu nome") });
const telegramChatIdSchema = z.object({
	telegramChatId: z
		.string()
		.trim()
		.regex(/^-?\d*$/, "Chat ID inválido — use apenas números"),
});

const paymentEventLabels: Record<string, string> = {
	succeeded: "Pagamento confirmado",
	failed: "Pagamento falhou",
};

function ProfilePage() {
	const { data: session } = useSession();
	const { data: config } = useAppConfig();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [nameError, setNameError] = useState<string | null>(null);
	const [nameSaved, setNameSaved] = useState(false);
	const [telegramError, setTelegramError] = useState<string | null>(null);
	const [telegramSaved, setTelegramSaved] = useState(false);

	const meQuery = useQuery({
		queryKey: ["me"],
		queryFn: async () => {
			const { data, error } = await api.users.me.get();
			if (error || !data || !("user" in data)) throw error ?? new Error("Falha ao carregar dados da conta");
			return data.user;
		},
	});

	const historyQuery = useQuery({
		queryKey: ["payment-history"],
		queryFn: async () => {
			const { data, error } = await api.payments.history.get();
			if (error || !data || !("logs" in data)) throw error ?? new Error("Falha ao carregar histórico");
			return data.logs;
		},
	});

	if (!session || !meQuery.data) return null;

	const me = meQuery.data;
	const userHasActivePlan = hasActivePlan(me);

	async function handleUpdateName(event: React.FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setNameSaved(false);
		setNameError(null);

		const result = nameSchema.safeParse({ name: new FormData(event.currentTarget).get("name") });

		if (!result.success) {
			setNameError(result.error.issues[0]?.message ?? "Nome inválido");
			return;
		}

		const { error } = await authClient.updateUser({ name: result.data.name });

		if (error) {
			setNameError(error.message ?? "Não foi possível atualizar seu nome");
			return;
		}

		setNameSaved(true);
	}

	async function handleUpdateTelegramChatId(event: React.FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setTelegramSaved(false);
		setTelegramError(null);

		const raw = new FormData(event.currentTarget).get("telegramChatId");
		const result = telegramChatIdSchema.safeParse({ telegramChatId: raw });

		if (!result.success) {
			setTelegramError(result.error.issues[0]?.message ?? "Chat ID inválido");
			return;
		}

		const { error } = await api.users.me.put({ telegramChatId: result.data.telegramChatId });

		if (error) {
			setTelegramError("Não foi possível salvar o Chat ID do Telegram");
			return;
		}

		setTelegramSaved(true);
		await queryClient.invalidateQueries({ queryKey: ["me"] });
	}

	async function handleDeleteAccount(): Promise<void> {
		const { data, error } = await api.users.me.delete();

		if (error || !data?.success) {
			throw new Error(
				(data as { message?: string } | undefined)?.message ?? "Não foi possível excluir sua conta",
			);
		}

		await signOut();
		await navigate({ to: "/" });
	}

	return (
		<PageLayout>
			<section className="mx-auto max-w-2xl px-4 py-16">
				<h1 className="text-3xl font-bold">Minha conta</h1>

				<div className="mt-8 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
					<h2 className="text-lg font-semibold">Dados da conta</h2>

					<form onSubmit={handleUpdateName} className="mt-4 flex flex-col gap-4">
						{nameError && <p className="text-sm text-red-500">{nameError}</p>}
						{nameSaved && <p className="text-sm text-brand-600">Nome atualizado com sucesso.</p>}

						<FormField label="Nome" id="name">
							<input
								id="name"
								name="name"
								type="text"
								defaultValue={session.user.name}
								className={inputClassName}
							/>
						</FormField>

						<FormField label="E-mail" id="email">
							<input
								id="email"
								type="email"
								value={session.user.email}
								disabled
								className={`${inputClassName} opacity-60`}
							/>
						</FormField>

						<button
							type="submit"
							className="self-start rounded-lg bg-brand-500 px-4 py-2 font-semibold text-black hover:bg-brand-400"
						>
							Salvar
						</button>
					</form>
				</div>

				<div className="mt-6 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
					<h2 className="text-lg font-semibold">Plano</h2>

					{userHasActivePlan ? (
						<p className="mt-3 text-sm text-(--color-fg-muted)">
							Plano <strong className="text-(--color-fg)">PRO</strong> ativo até{" "}
							{me.planExpiresAt ? new Date(me.planExpiresAt).toLocaleDateString("pt-BR") : "—"}.
						</p>
					) : (
						<>
							<p className="mt-2 text-sm text-(--color-fg-muted)">
								Plano atual: <strong className="text-(--color-fg)">Gratuito</strong> —{" "}
								{me.freeTransactionCount}/{FREE_TRANSACTION_LIMIT} transações utilizadas.
							</p>
							{me.freeTransactionCount >= FREE_TRANSACTION_LIMIT && (
								<p className="mt-2 text-sm text-red-500">
									Limite de transações gratuitas atingido — assine um plano para continuar
									adicionando, importando ou exportando transações.
								</p>
							)}
							{config?.enableAbacatepay && (
								<Link
									to="/checkout"
									className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black hover:bg-brand-400"
								>
									Assinar um plano
								</Link>
							)}
						</>
					)}

					{historyQuery.data && historyQuery.data.length > 0 && (
						<div className="mt-5 border-t border-(--color-border) pt-4">
							<h3 className="text-sm font-semibold">Histórico de pagamentos</h3>
							<ul className="mt-2 flex flex-col gap-2">
								{historyQuery.data.map((log) => (
									<li
										key={log.id}
										className="flex items-center justify-between text-sm text-(--color-fg-muted)"
									>
										<span>
											{paymentEventLabels[log.status] ?? log.status}
											{log.amount != null
												? ` — ${(log.amount / 100).toFixed(2)} ${(log.currency ?? "").toUpperCase()}`
												: ""}
										</span>
										<span>{new Date(log.createdAt).toLocaleDateString("pt-BR")}</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				{config?.enable2FA && (
					<div className="mt-6 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
						<h2 className="text-lg font-semibold">Autenticação em duas etapas</h2>
						<div className="mt-4">
							<TwoFactorSettings enabled={Boolean(session.user.twoFactorEnabled)} />
						</div>
					</div>
				)}

				<div className="mt-6 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
					<h2 className="text-lg font-semibold">Bot do Telegram</h2>
					<p className="mt-2 text-sm text-(--color-fg-muted)">
						Abra o bot no Telegram e envie o ID da conta abaixo quando ele pedir — isso vincula as
						transações feitas pelo bot à sua conta. Você também pode informar o Chat ID manualmente aqui.
					</p>

					<div className="mt-3 rounded-lg border border-(--color-border) bg-(--color-bg-subtle) p-3">
						<p className="text-xs font-medium text-(--color-fg-muted)">ID da conta</p>
						<code className="mt-1 block break-all text-xs">{me.id}</code>
					</div>

					<form onSubmit={handleUpdateTelegramChatId} className="mt-4 flex flex-col gap-4">
						{telegramError && <p className="text-sm text-red-500">{telegramError}</p>}
						{telegramSaved && <p className="text-sm text-brand-600">Chat ID salvo com sucesso.</p>}

						<FormField label="Chat ID do Telegram" id="telegramChatId">
							<input
								id="telegramChatId"
								name="telegramChatId"
								type="text"
								inputMode="numeric"
								defaultValue={me.telegramChatId ?? ""}
								placeholder="Ex: 123456789"
								className={inputClassName}
							/>
						</FormField>

						<button
							type="submit"
							className="self-start rounded-lg bg-brand-500 px-4 py-2 font-semibold text-black hover:bg-brand-400"
						>
							Salvar
						</button>
					</form>
				</div>

				<DeleteAccountSection hasActivePlan={userHasActivePlan} onConfirm={handleDeleteAccount} />
			</section>
		</PageLayout>
	);
}
