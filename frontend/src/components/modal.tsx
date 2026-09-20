import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

export function Modal({
	title,
	onClose,
	children,
	maxWidth = "max-w-md",
}: {
	title: string;
	onClose: () => void;
	children: ReactNode;
	maxWidth?: string;
}) {
	const dialogRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent): void {
			if (event.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handleKeyDown);
		dialogRef.current?.focus();
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
			<button
				type="button"
				onClick={onClose}
				aria-label="Fechar modal"
				className="absolute inset-0 cursor-default"
			/>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
				tabIndex={-1}
				className={`relative w-full ${maxWidth} rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 outline-none`}
			>
				<div className="flex items-center justify-between">
					<h2 id="modal-title" className="text-lg font-semibold">
						{title}
					</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Fechar"
						className="rounded-lg p-1 text-(--color-fg-muted) hover:bg-brand-500/10"
					>
						✕
					</button>
				</div>
				<div className="mt-4">{children}</div>
			</div>
		</div>
	);
}
