import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { Modal } from "./modal";

const CLOSE_COOLDOWN_SECONDS = 60;
const POLL_INTERVAL_MS = 3000;
const TEST_MODE_PAYMENT_DELAY_MS = 10_000;
const POST_PAYMENT_REDIRECT_SECONDS = 10;

type Charge = { id: string; brCode: string; brCodeBase64: string; expiresAt: string };

export function PixCheckoutModal({
	charge,
	testModeEnabled,
	onClose,
	onPaid,
}: {
	charge: Charge;
	testModeEnabled: boolean;
	onClose: () => void;
	onPaid: (planExpiresAt: string) => void;
}) {
	const navigate = useNavigate();
	const [status, setStatus] = useState<"pending" | "paid" | "expired">("pending");
	const [paidMonths, setPaidMonths] = useState(0);
	const [redirectCooldown, setRedirectCooldown] = useState(POST_PAYMENT_REDIRECT_SECONDS);
	const [closeCooldown, setCloseCooldown] = useState(CLOSE_COOLDOWN_SECONDS);
	const [simulating, setSimulating] = useState(false);
	const [simulateMessage, setSimulateMessage] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const paidRef = useRef(false);

	const secondsLeft = Math.max(0, Math.floor((new Date(charge.expiresAt).getTime() - Date.now()) / 1000));
	const [remainingSeconds, setRemainingSeconds] = useState(secondsLeft);

	useEffect(() => {
		if (closeCooldown <= 0) return;
		const timer = setTimeout(() => setCloseCooldown((current) => current - 1), 1000);
		return () => clearTimeout(timer);
	}, [closeCooldown]);

	useEffect(() => {
		if (remainingSeconds <= 0 || status !== "pending") return;
		const timer = setTimeout(() => setRemainingSeconds((current) => Math.max(0, current - 1)), 1000);
		return () => clearTimeout(timer);
	}, [remainingSeconds, status]);

	useEffect(() => {
		if (status !== "pending") return;

		const interval = setInterval(async () => {
			const { data } = await api.payments.pix({ id: charge.id }).status.get();
			if (!data || !("status" in data)) return;

			if (data.status === "paid" && !paidRef.current) {
				paidRef.current = true;
				setPaidMonths(data.months);
				setStatus("paid");
				onPaid(data.planExpiresAt ?? "");
			} else if (data.status === "expired") {
				setStatus("expired");
			}
		}, POLL_INTERVAL_MS);

		return () => clearInterval(interval);
	}, [charge.id, status, onPaid]);

	// Locks closing during the countdown so the user always sees the
	// confirmation before being sent to the dashboard.
	useEffect(() => {
		if (status !== "paid") return;
		if (redirectCooldown <= 0) {
			navigate({ to: "/dashboard" });
			return;
		}
		const timer = setTimeout(() => setRedirectCooldown((current) => current - 1), 1000);
		return () => clearTimeout(timer);
	}, [status, redirectCooldown, navigate]);

	async function handleSimulate(): Promise<void> {
		setSimulating(true);
		setSimulateMessage("Esse PIX será pago em 10 segundos...");

		const { error } = await api.payments.pix({ id: charge.id }).simulate.post();

		if (error) {
			setSimulateMessage("Não foi possível simular o pagamento");
			setSimulating(false);
			return;
		}

		setTimeout(async () => {
			const { data } = await api.payments.pix({ id: charge.id }).status.get();
			if (data && "status" in data && data.status === "paid") {
				paidRef.current = true;
				setPaidMonths(data.months);
				setStatus("paid");
				onPaid(data.planExpiresAt ?? "");
			}
			setSimulating(false);
		}, TEST_MODE_PAYMENT_DELAY_MS);
	}

	async function handleCopy(): Promise<void> {
		await navigator.clipboard.writeText(charge.brCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	const canClose = status === "expired" || (status === "pending" && closeCooldown <= 0);

	function handleClose(): void {
		if (!canClose) return;
		onClose();
	}

	const minutes = Math.floor(remainingSeconds / 60);
	const seconds = remainingSeconds % 60;
	const qrSrc = charge.brCodeBase64.startsWith("data:")
		? charge.brCodeBase64
		: `data:image/png;base64,${charge.brCodeBase64}`;

	return (
		<Modal title="Pagamento via PIX" onClose={handleClose}>
			{status === "paid" ? (
				<div className="flex flex-col items-center gap-2 text-center">
					<p className="text-sm text-brand-600" role="status">
						PIX pago com sucesso! Você assinou {paidMonths} {paidMonths === 1 ? "mês" : "meses"} do Plano
						PRO!
					</p>
					<p className="text-xs text-(--color-fg-muted)">
						Redirecionando para o dashboard em {redirectCooldown} segundo{redirectCooldown === 1 ? "" : "s"}
						...
					</p>
				</div>
			) : status === "expired" ? (
				<p className="text-sm text-red-500" role="status">
					Esse PIX expirou. Feche esta janela e gere um novo código.
				</p>
			) : (
				<div className="flex flex-col items-center gap-4">
					<p className="text-center text-sm text-(--color-fg-muted)" role="status">
						Você tem {minutes}:{seconds.toString().padStart(2, "0")} minutos para pagar esse PIX. Aguardando
						pagamento...
					</p>

					<img
						src={qrSrc}
						alt="QR code do PIX"
						className="size-56 rounded-lg border border-(--color-border)"
					/>

					<div className="w-full">
						<p className="text-xs font-medium text-(--color-fg-muted)">PIX copia e cola</p>
						<div className="mt-1 flex items-center gap-2">
							<code className="flex-1 truncate rounded-lg border border-(--color-border) bg-(--color-bg-subtle) px-3 py-2 text-xs">
								{charge.brCode}
							</code>
							<button
								type="button"
								onClick={handleCopy}
								className="shrink-0 rounded-lg border border-(--color-border) px-3 py-2 text-xs font-medium hover:bg-brand-500/10"
							>
								{copied ? "Copiado!" : "Copiar"}
							</button>
						</div>
					</div>

					{testModeEnabled && (
						<div className="w-full border-t border-(--color-border) pt-3">
							<button
								type="button"
								onClick={handleSimulate}
								disabled={simulating}
								className="w-full rounded-lg border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-500/10 disabled:opacity-60"
							>
								Pagar PIX Teste Mode
							</button>
							{simulateMessage && (
								<p className="mt-2 text-center text-xs text-(--color-fg-muted)">{simulateMessage}</p>
							)}
						</div>
					)}
				</div>
			)}

			<button
				type="button"
				onClick={handleClose}
				disabled={!canClose}
				className="mt-6 w-full rounded-lg border border-(--color-border) px-4 py-2 text-sm font-semibold disabled:opacity-40"
			>
				{status === "pending" && closeCooldown > 0
					? `Você pode fechar essa aba em ${closeCooldown} segundos...`
					: status === "paid"
						? "Redirecionando..."
						: "Fechar"}
			</button>
		</Modal>
	);
}
