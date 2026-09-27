import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { AuthCard } from "../components/auth-card";
import { GoogleButton } from "../components/google-button";
import { api } from "../lib/api";
import { apiErrorMessage } from "../lib/api-error";
import { useSession } from "../lib/auth-client";

const searchSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/telegram-vincular")({
	head: () => ({ meta: [{ title: "Vincular Telegram — Money" }] }),
	validateSearch: searchSchema,
	component: TelegramLinkPage,
});

/**
 * Browser half of the bot's "log in through the browser" flow: the bot can't
 * run OAuth inside the chat, so it sends the user here with a single-use
 * token (see backend/src/modules/telegram). Once there is an authenticated
 * session, the page redeems the token and links the chat.
 */
function TelegramLinkPage() {
	const { token } = Route.useSearch();
	const { data: session, isPending } = useSession();
	const attempted = useRef(false);

	const linkMutation = useMutation({
		mutationFn: async (linkToken: string) => {
			const { data, error } = await api.telegram.link.post({ token: linkToken });
			if (error) throw error;
			return data;
		},
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: linkMutation is left out on purpose — it must fire once when token and session become available, not on every re-render.
	useEffect(() => {
		if (!token || !session || attempted.current) return;
		attempted.current = true;
		linkMutation.mutate(token);
	}, [token, session]);

	if (!token) {
		return (
			<AuthCard title="Link inválido" subtitle="Volte ao bot do Telegram e gere um novo link de login.">
				<p role="alert" className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">
					Nenhum token de vínculo foi informado.
				</p>
			</AuthCard>
		);
	}

	if (isPending) {
		return (
			<AuthCard title="Vincular Telegram" subtitle="Verificando sua sessão...">
				<p className="text-sm text-(--color-fg-muted)">Aguarde um instante.</p>
			</AuthCard>
		);
	}

	if (!session) {
		return (
			<AuthCard
				title="Entrar para vincular o Telegram"
				subtitle="Faça login para concluir o vínculo com o bot."
				centerHeader
			>
				<GoogleButton
					label="Entrar com Google"
					callbackURL={`/telegram-vincular?token=${encodeURIComponent(token)}`}
				/>
			</AuthCard>
		);
	}

	if (linkMutation.isSuccess) {
		return (
			<AuthCard title="Telegram vinculado!" subtitle="Pode voltar para o Telegram e continuar por lá.">
				<p role="status" className="rounded-lg bg-brand-500/10 px-4 py-3 text-sm text-brand-600">
					✅ Sua conta foi vinculada ao chat do bot com sucesso.
				</p>
			</AuthCard>
		);
	}

	if (linkMutation.isError) {
		return (
			<AuthCard title="Não foi possível vincular" subtitle="Volte ao bot do Telegram e gere um novo link.">
				<p role="alert" className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">
					{apiErrorMessage(linkMutation.error, "Link inválido ou expirado")}
				</p>
			</AuthCard>
		);
	}

	return (
		<AuthCard title="Vincular Telegram" subtitle="Concluindo o vínculo com o bot...">
			<p className="text-sm text-(--color-fg-muted)">Aguarde um instante.</p>
		</AuthCard>
	);
}
