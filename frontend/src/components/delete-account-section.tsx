import { useEffect, useState } from "react";
import { Modal } from "./modal";

const COOLDOWN_SECONDS = 10;

export function DeleteAccountSection({
	hasActivePlan,
	onConfirm,
}: {
	hasActivePlan: boolean;
	onConfirm: () => Promise<void>;
}) {
	const [modalOpen, setModalOpen] = useState(false);
	const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!modalOpen || hasActivePlan || secondsLeft <= 0) return;
		const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
		return () => clearTimeout(timer);
	}, [modalOpen, hasActivePlan, secondsLeft]);

	function openModal(): void {
		setSecondsLeft(COOLDOWN_SECONDS);
		setError(null);
		setModalOpen(true);
	}

	async function handleConfirm(): Promise<void> {
		setDeleting(true);
		setError(null);
		try {
			await onConfirm();
			setModalOpen(false);
		} catch (confirmError) {
			setError(confirmError instanceof Error ? confirmError.message : "Não foi possível excluir sua conta");
		} finally {
			setDeleting(false);
		}
	}

	return (
		<div className="mt-6 rounded-2xl border border-red-500/30 bg-(--color-surface) p-6">
			<h2 className="text-lg font-semibold text-red-500">Excluir conta</h2>
			<p className="mt-2 text-sm text-(--color-fg-muted)">
				Essa ação remove todos os seus dados. Não é possível excluir a conta com um plano ativo.
			</p>

			<button
				type="button"
				onClick={openModal}
				className="mt-4 rounded-lg border border-red-500 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10"
			>
				Excluir minha conta
			</button>

			{modalOpen && (
				<Modal title="Excluir conta" onClose={() => setModalOpen(false)}>
					{hasActivePlan ? (
						<p className="text-sm text-(--color-fg-muted)">
							Você tem um plano ativo. Cancele ou aguarde o vencimento do plano antes de excluir sua
							conta.
						</p>
					) : (
						<div className="flex flex-col gap-4">
							<p className="text-sm text-(--color-fg-muted)">
								Sua conta será marcada para exclusão. Você tem <strong>30 dias</strong> para fazer login
								novamente e cancelar o processo — basta entrar na sua conta normalmente. Depois desse
								prazo, a conta e todos os seus dados são apagados <strong>definitivamente</strong>, sem
								possibilidade de recuperação.
							</p>

							{error && <p className="text-sm text-red-500">{error}</p>}

							<button
								type="button"
								onClick={handleConfirm}
								disabled={secondsLeft > 0 || deleting}
								className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
							>
								{deleting
									? "Excluindo..."
									: secondsLeft > 0
										? `${secondsLeft} segundos para confirmar exclusão de conta`
										: "Confirmar exclusão de conta"}
							</button>
						</div>
					)}
				</Modal>
			)}
		</div>
	);
}
