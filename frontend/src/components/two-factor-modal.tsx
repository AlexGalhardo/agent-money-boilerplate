import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { translateAuthError } from "../lib/auth-errors";
import { inputClassName } from "./auth-card";
import { Modal } from "./modal";

type TwoFactorModalProps = {
	methods: string[];
	onVerified: () => void;
	onClose: () => void;
};

export function TwoFactorModal({ methods, onVerified, onClose }: TwoFactorModalProps) {
	const [mode, setMode] = useState<"totp" | "otp">(methods.includes("totp") ? "totp" : "otp");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [otpSent, setOtpSent] = useState(false);

	async function handleSendEmailCode(): Promise<void> {
		setMode("otp");
		setError(null);
		setLoading(true);
		const { error: sendError } = await authClient.twoFactor.sendOtp();
		setLoading(false);

		if (sendError) {
			setError(translateAuthError(sendError, "Não foi possível enviar o código por e-mail"));
			return;
		}

		setOtpSent(true);
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setError(null);

		if (code.length !== 6) {
			setError("Informe o código de 6 dígitos");
			return;
		}

		setLoading(true);
		const { error: verifyError } =
			mode === "totp"
				? await authClient.twoFactor.verifyTotp({ code })
				: await authClient.twoFactor.verifyOtp({ code });
		setLoading(false);

		if (verifyError) {
			setError(translateAuthError(verifyError, "Código inválido"));
			return;
		}

		onVerified();
	}

	return (
		<Modal title="Verificação em duas etapas" onClose={onClose}>
			<form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
				<p className="text-sm text-(--color-fg-muted)">
					{mode === "totp"
						? "Digite o código de 6 dígitos do seu aplicativo autenticador."
						: otpSent
							? "Digite o código de 6 dígitos que enviamos para o seu e-mail."
							: "Enviando código por e-mail..."}
				</p>

				{error && (
					<p role="alert" className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">
						{error}
					</p>
				)}

				<input
					id="two-factor-code"
					name="code"
					type="text"
					inputMode="numeric"
					maxLength={6}
					autoComplete="one-time-code"
					value={code}
					onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
					className={inputClassName}
				/>

				<button
					type="submit"
					disabled={loading}
					className="rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-black hover:bg-brand-400 disabled:opacity-60"
				>
					{loading ? "Verificando..." : "Verificar"}
				</button>

				{mode === "totp" && (
					<button
						type="button"
						onClick={handleSendEmailCode}
						className="text-center text-sm font-medium text-brand-600 hover:underline"
					>
						Enviar códigos por e-mail
					</button>
				)}
			</form>
		</Modal>
	);
}
