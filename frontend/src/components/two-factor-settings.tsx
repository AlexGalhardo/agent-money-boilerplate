import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { FormField, inputClassName } from "./auth-card";

type SetupData = { totpURI: string; backupCodes: string[]; qrDataUrl: string };

export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [setup, setSetup] = useState<SetupData | null>(null);
	const [code, setCode] = useState("");
	const [confirmed, setConfirmed] = useState(false);

	async function handleEnable(event: React.FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setError(null);
		setLoading(true);

		const { data, error: enableError } = await authClient.twoFactor.enable({ password, method: "totp" });
		setLoading(false);

		if (enableError || !data || data.method !== "totp") {
			setError(enableError?.message ?? "Não foi possível ativar o 2FA");
			return;
		}

		const QRCode = await import("qrcode");
		const qrDataUrl = await QRCode.toDataURL(data.totpURI);
		setSetup({ totpURI: data.totpURI, backupCodes: data.backupCodes ?? [], qrDataUrl });
		setPassword("");
	}

	async function handleVerify(event: React.FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setError(null);

		if (code.length !== 6) {
			setError("Informe o código de 6 dígitos");
			return;
		}

		setLoading(true);
		const { error: verifyError } = await authClient.twoFactor.verifyTotp({ code });
		setLoading(false);

		if (verifyError) {
			setError(verifyError.message ?? "Código inválido");
			return;
		}

		setConfirmed(true);
		setSetup(null);
	}

	async function handleDisable(event: React.FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setError(null);
		setLoading(true);

		const { error: disableError } = await authClient.twoFactor.disable({ password });
		setLoading(false);

		if (disableError) {
			setError(disableError.message ?? "Não foi possível desativar o 2FA");
			return;
		}

		setPassword("");
		setConfirmed(false);
	}

	if (confirmed || (enabled && !setup)) {
		return (
			<div>
				<p className="text-sm text-brand-600">A verificação em duas etapas está ativada para sua conta.</p>
				<form onSubmit={handleDisable} className="mt-4 flex flex-col gap-3">
					{error && <p className="text-sm text-red-500">{error}</p>}
					<FormField label="Confirme sua senha para desativar" id="disable-password">
						<input
							id="disable-password"
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className={inputClassName}
						/>
					</FormField>
					<button
						type="submit"
						disabled={loading}
						className="self-start rounded-lg border border-red-500 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10 disabled:opacity-60"
					>
						{loading ? "Desativando..." : "Desativar 2FA"}
					</button>
				</form>
			</div>
		);
	}

	if (setup) {
		return (
			<div>
				<p className="text-sm text-(--color-fg-muted)">
					Escaneie o QR code no seu aplicativo autenticador (Google Authenticator, Authy, etc.) e confirme com
					o código gerado.
				</p>
				<img src={setup.qrDataUrl} alt="QR code para configurar o autenticador" className="mt-4 size-48" />

				{setup.backupCodes.length > 0 && (
					<div className="mt-4 rounded-lg border border-(--color-border) bg-(--color-bg-subtle) p-3">
						<p className="text-xs font-medium text-(--color-fg-muted)">
							Códigos de backup — guarde em local seguro:
						</p>
						<p className="mt-1 break-all font-mono text-xs">{setup.backupCodes.join(" · ")}</p>
					</div>
				)}

				<form onSubmit={handleVerify} className="mt-4 flex flex-col gap-3">
					{error && <p className="text-sm text-red-500">{error}</p>}
					<FormField label="Código de 6 dígitos" id="verify-code">
						<input
							id="verify-code"
							type="text"
							inputMode="numeric"
							maxLength={6}
							value={code}
							onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
							className={inputClassName}
						/>
					</FormField>
					<button
						type="submit"
						disabled={loading}
						className="self-start rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black hover:bg-brand-400 disabled:opacity-60"
					>
						{loading ? "Confirmando..." : "Confirmar ativação"}
					</button>
				</form>
			</div>
		);
	}

	return (
		<div>
			<p className="text-sm text-(--color-fg-muted)">
				Adicione uma camada extra de segurança com um aplicativo autenticador.
			</p>
			<form onSubmit={handleEnable} className="mt-4 flex flex-col gap-3">
				{error && <p className="text-sm text-red-500">{error}</p>}
				<FormField label="Confirme sua senha" id="enable-password">
					<input
						id="enable-password"
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						className={inputClassName}
					/>
				</FormField>
				<button
					type="submit"
					disabled={loading}
					className="self-start rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black hover:bg-brand-400 disabled:opacity-60"
				>
					{loading ? "Ativando..." : "Ativar 2FA"}
				</button>
			</form>
		</div>
	);
}
