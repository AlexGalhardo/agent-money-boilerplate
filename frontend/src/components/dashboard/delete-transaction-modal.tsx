import { Modal } from "../modal";

type Props = {
	description: string;
	pending: boolean;
	onConfirm: () => void;
	onClose: () => void;
};

export function DeleteTransactionModal({ description, pending, onConfirm, onClose }: Props) {
	return (
		<Modal title="Excluir transação" onClose={onClose}>
			<p className="text-sm text-(--color-fg-muted)">
				Tem certeza que deseja excluir <strong className="text-(--color-fg)">{description}</strong>? Essa ação
				não pode ser desfeita.
			</p>
			<div className="mt-4 flex gap-3">
				<button
					type="button"
					onClick={onConfirm}
					disabled={pending}
					className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
				>
					{pending ? "Excluindo..." : "Confirmar exclusão"}
				</button>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg border border-(--color-border) px-4 py-2 text-sm font-semibold"
				>
					Cancelar
				</button>
			</div>
		</Modal>
	);
}
