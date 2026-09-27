import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { apiErrorMessage } from "../lib/api-error";
import { queryKeys } from "../lib/queries";

/**
 * Linking happens only from the bot (logging in there, or through the
 * single-use browser link it sends) — this page never accepts a chat ID, so
 * nobody can attach someone else's Telegram chat to their account.
 */
export function TelegramLinkSection({ telegramChatId }: { telegramChatId: string | null }) {
	const queryClient = useQueryClient();
	const [error, setError] = useState<string | null>(null);
	const [unlinking, setUnlinking] = useState(false);

	async function handleUnlink(): Promise<void> {
		setError(null);
		setUnlinking(true);
		const { error: requestError } = await api.telegram.link.delete();
		setUnlinking(false);

		if (requestError) {
			setError(apiErrorMessage(requestError, "Não foi possível desvincular o Telegram"));
			return;
		}
		await queryClient.invalidateQueries({ queryKey: queryKeys.me });
	}

	return (
		<div className="mt-6 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
			<h2 className="text-lg font-semibold">Bot do Telegram</h2>

			{telegramChatId ? (
				<>
					<p className="mt-2 text-sm text-(--color-fg-muted)">
						Sua conta está vinculada a um chat do Telegram. As transações feitas pelo bot entram nesta
						conta.
					</p>
					{error && <p className="mt-3 text-sm text-red-500">{error}</p>}
					<button
						type="button"
						onClick={handleUnlink}
						disabled={unlinking}
						className="mt-4 rounded-lg border border-(--color-border) px-4 py-2 text-sm font-semibold hover:bg-(--color-bg-subtle) disabled:opacity-60"
					>
						{unlinking ? "Desvinculando..." : "Desvincular Telegram"}
					</button>
				</>
			) : (
				<p className="mt-2 text-sm text-(--color-fg-muted)">
					Nenhum chat vinculado. Abra o bot no Telegram e entre com seu e-mail e senha — ou escolha “Entrar
					pelo navegador” para usar o Google.
				</p>
			)}
		</div>
	);
}
