import { useState } from "react";
import { z } from "zod";
import { authClient } from "../../lib/auth-client";
import { translateAuthError } from "../../lib/auth-errors";
import { FormField, inputClassName } from "../auth-card";

const nameSchema = z.object({ name: z.string().trim().min(1, "Informe seu nome").max(120) });

export function ProfileSection({ name, email }: { name: string; email: string }) {
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setSaved(false);
		setError(null);

		const result = nameSchema.safeParse({ name: new FormData(event.currentTarget).get("name") });
		if (!result.success) {
			setError(result.error.issues[0]?.message ?? "Nome inválido");
			return;
		}

		const { error: requestError } = await authClient.updateUser({ name: result.data.name });
		if (requestError) {
			setError(translateAuthError(requestError, "Não foi possível atualizar seu nome"));
			return;
		}

		setSaved(true);
	}

	return (
		<div className="mt-8 rounded-2xl border border-(--color-border) bg-(--color-surface) p-6">
			<h2 className="text-lg font-semibold">Dados da conta</h2>

			<form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
				{error && <p className="text-sm text-red-500">{error}</p>}
				{saved && <p className="text-sm text-brand-600">Nome atualizado com sucesso.</p>}

				<FormField label="Nome" id="name">
					<input id="name" name="name" type="text" defaultValue={name} className={inputClassName} />
				</FormField>

				<FormField label="E-mail" id="email">
					<input id="email" type="email" value={email} disabled className={`${inputClassName} opacity-60`} />
				</FormField>

				<button
					type="submit"
					className="self-start rounded-lg bg-brand-500 px-4 py-2 font-semibold text-black hover:bg-brand-400"
				>
					Salvar
				</button>
			</form>
		</div>
	);
}
